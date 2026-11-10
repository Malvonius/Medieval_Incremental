import { type Readable, type Writable, writable } from "svelte/store";
import { startLoop } from "../core/loop";
import type { DeepReadonly, Result } from "../core/types";
import { GAP_THRESHOLD_SECONDS, TICK_SECONDS } from "../content/balance";
import type { Action } from "../game/actions";
import { type CatchUpReport, applyOfflineProgress, catchUp } from "../game/offline";
import { type KeyValueStorage, SAVE_KEY, exportSave, importSave, readSave, writeSave } from "../game/persistence";
import type { Rates } from "../game/rates";
import { Simulation } from "../game/simulation";
import { type GameState, createInitialState } from "../game/state";
import type { StoryNode } from "../game/story";

/**
 * Pro Frame neu erzeugt, damit Svelte Änderungen erkennt. Achtung: `state` ist dieselbe, intern
 * veränderte Instanz. In Komponenten daher nie `$derived(snap.state.x)` auf ein Objekt bilden,
 * sondern Werte direkt lesen oder flach kopieren.
 */
export interface Snapshot {
  readonly state: DeepReadonly<GameState>;
  readonly rates: Rates;
  readonly frame: number;
}

export type Notice =
  | { readonly kind: "offline"; readonly report: CatchUpReport }
  | { readonly kind: "info"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

const AUTOSAVE_MS = 30_000;

/**
 * Verbindet Simulation, Loop, Speicher und UI-Stores. Die UI ruft nur `dispatch` & Co. auf
 * und liest ausschließlich Snapshots – sie verändert den Spielstand nie direkt.
 */
export class GameController {
  private sim: Simulation;
  private unsubscribeStory: () => void = () => {};
  private stopLoop: (() => void) | null = null;
  private autosaveHandle: ReturnType<typeof setInterval> | null = null;
  private frame = 0;
  private readonly snapshotStore: Writable<Snapshot>;

  readonly storyQueue = writable<readonly StoryNode[]>([]);
  readonly notice = writable<Notice | null>(null);

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly clock: () => number = Date.now,
  ) {
    const now = this.clock();
    const loaded = readSave(storage, now);
    this.sim = this.attach(loaded.kind === "loaded" ? loaded.state : createInitialState(now));
    this.snapshotStore = writable(this.makeSnapshot());

    if (loaded.kind === "corrupt") {
      this.notice.set({
        kind: "error",
        message: `${loaded.error.message} Eine Kopie wurde gesichert; es beginnt ein neues Spiel.`,
      });
    } else if (loaded.kind === "loaded") {
      const report = applyOfflineProgress(this.sim, now);
      if (report) this.notice.set({ kind: "offline", report });
    }
    this.publish();
  }

  get snapshot(): Readable<Snapshot> {
    return this.snapshotStore;
  }

  private attach(state: GameState): Simulation {
    this.unsubscribeStory();
    const sim = new Simulation(state);
    this.unsubscribeStory = sim.events.on("story", (node) => this.storyQueue.update((q) => [...q, node]));
    return sim;
  }

  private makeSnapshot(): Snapshot {
    this.frame += 1;
    return { state: this.sim.view, rates: this.sim.rates, frame: this.frame };
  }

  private publish(): void {
    this.snapshotStore.set(this.makeSnapshot());
  }

  private readonly onVisibility = (): void => {
    if (document.visibilityState === "hidden") this.save();
  };

  private readonly onUnload = (): void => this.save();

  start(): void {
    if (this.stopLoop) return;
    this.stopLoop = startLoop({
      tickSeconds: TICK_SECONDS,
      gapThresholdSeconds: GAP_THRESHOLD_SECONDS,
      tick: (dt) => this.sim.tick(dt),
      // Tab war im Hintergrund: volle Effizienz, aber gleiche Obergrenze wie offline.
      onGap: (seconds) => void catchUp(this.sim, seconds, 1),
      render: () => this.publish(),
    });
    this.autosaveHandle = setInterval(() => this.save(), AUTOSAVE_MS);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("beforeunload", this.onUnload);
  }

  stop(): void {
    this.stopLoop?.();
    this.stopLoop = null;
    if (this.autosaveHandle !== null) clearInterval(this.autosaveHandle);
    this.autosaveHandle = null;
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("beforeunload", this.onUnload);
  }

  dispatch(action: Action): Result {
    const result = this.sim.dispatch(action);
    if (result.ok) this.publish();
    else this.notice.set({ kind: "error", message: result.reason });
    return result;
  }

  dismissStory(): void {
    this.storyQueue.update((q) => q.slice(1));
  }

  dismissNotice(): void {
    this.notice.set(null);
  }

  storyNode(id: string): StoryNode | undefined {
    return this.sim.storyNode(id);
  }

  save(): void {
    this.sim.touch(this.clock());
    try {
      writeSave(this.storage, this.sim.view);
    } catch (error) {
      // Typisch: Speicherkontingent erschöpft oder Storage im privaten Modus gesperrt.
      console.error("Speichern fehlgeschlagen", error);
      this.notice.set({ kind: "error", message: "Speichern fehlgeschlagen – der Browser verweigert den Zugriff." });
    }
  }

  exportText(): string {
    this.sim.touch(this.clock());
    return exportSave(this.sim.view);
  }

  importText(text: string): Result {
    try {
      const state = importSave(text, this.clock());
      state.lastSeen = this.clock();
      this.replaceState(state, "Spielstand geladen.");
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.notice.set({ kind: "error", message });
      return { ok: false, reason: message };
    }
  }

  reset(): void {
    this.storage.removeItem(SAVE_KEY);
    this.replaceState(createInitialState(this.clock()), "Ein neues Spiel beginnt.");
  }

  private replaceState(state: GameState, message: string): void {
    this.storyQueue.set([]);
    this.sim = this.attach(state);
    this.save();
    this.publish();
    this.notice.set({ kind: "info", message });
  }
}
