import { type Readable, type Writable, writable } from "svelte/store";
import { startLoop } from "../core/loop";
import { RingBuffer } from "../core/ringBuffer";
import type { AchievementId } from "../content/achievements";
import { setNotation, setNumberLocale } from "../ui/format";
import { locale } from "../i18n";
import { ACTION_CUES, audio } from "./audio";
import { settings } from "./settings";
import type { DeepReadonly, Result } from "../core/types";
import { GAP_THRESHOLD_SECONDS, TICK_SECONDS } from "../content/balance";
import type { Action } from "../game/actions";
import { type CatchUpReport, applyOfflineProgress, catchUp } from "../game/offline";
import {
  type KeyValueStorage,
  SLOT_KEY,
  type SlotNumber,
  type SlotSummary,
  exportSave,
  importSave,
  isSlot,
  readSave,
  slotKey,
  summarizeSlot,
  writeSave,
} from "../game/persistence";
import { notifyCompletion } from "./notifications";
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
  | { readonly kind: "achievement"; readonly id: AchievementId }
  | { readonly kind: "error"; readonly message: string };

/** Verlauf der Goldproduktion: ein Wert pro Spielminute, bis zu 8 Stunden. */
const HISTORY_MINUTES = 480;

/**
 * Verbindet Simulation, Loop, Speicher und UI-Stores. Die UI ruft nur `dispatch` & Co. auf
 * und liest ausschließlich Snapshots – sie verändert den Spielstand nie direkt.
 */
export class GameController {
  private sim: Simulation;
  private unsubscribeStory: () => void = () => {};
  private stopLoop: (() => void) | null = null;
  private autosaveHandle: ReturnType<typeof setInterval> | null = null;
  private unsubscribeSettings: () => void = () => {};
  private lastSampleMinute = -1;
  private readonly historyBuffer = new RingBuffer<number>(HISTORY_MINUTES);
  /** log10 der Goldproduktion je Spielminute, älteste zuerst. */
  readonly history = writable<readonly number[]>([]);
  private frame = 0;
  private readonly snapshotStore: Writable<Snapshot>;

  readonly storyQueue = writable<readonly StoryNode[]>([]);
  /** Aktiver Speicherplatz (1–3); wird im Storage gemerkt. */
  readonly slot = writable<SlotNumber>(1);
  private currentSlot: SlotNumber = 1;
  /** Kurzinfos der inaktiven Plätze: ändern sich nur beim Wechsel, daher nicht bei jedem Frame neu lesen. */
  private slotCache = new Map<SlotNumber, SlotSummary>();
  readonly notice = writable<Notice | null>(null);

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly clock: () => number = Date.now,
  ) {
    const now = this.clock();
    const storedSlot = Number(storage.getItem(SLOT_KEY));
    this.currentSlot = isSlot(storedSlot) ? storedSlot : 1;
    this.slot.set(this.currentSlot);
    const loaded = readSave(storage, now, this.currentSlot);
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
    const offStory = sim.events.on("story", (node) => this.storyQueue.update((q) => [...q, node]));
    const offAchievement = sim.events.on("achievement", (id) =>
      this.notice.set({ kind: "achievement", id }),
    );
    const offStoryCue = sim.events.on("story", () => audio.play("story"));
    const offCompleted = sim.events.on("completed", (completion) => notifyCompletion(completion));
    const offAction = sim.events.on("action", (type) => {
      const cue = ACTION_CUES[type];
      if (cue) audio.play(cue);
    });
    this.unsubscribeStory = () => {
      offStory();
      offAchievement();
      offStoryCue();
      offAction();
      offCompleted();
    };
    return sim;
  }

  private makeSnapshot(): Snapshot {
    this.frame += 1;
    return { state: this.sim.view, rates: this.sim.rates, frame: this.frame };
  }

  private publish(): void {
    this.sampleHistory();
    audio.setAct(this.currentAct());
    this.snapshotStore.set(this.makeSnapshot());
  }

  private currentAct(): number {
    const { flags } = this.sim.view;
    return 1 + [flags.act1Complete, flags.act2Complete, flags.act3Complete, flags.act4Complete].filter(Boolean).length;
  }

  private sampleHistory(): void {
    const minute = Math.floor(this.sim.view.stats.playSeconds / 60);
    if (minute === this.lastSampleMinute) return;
    this.lastSampleMinute = minute;
    const rate = this.sim.rates.gold;
    this.historyBuffer.push(rate.gt(0) ? rate.log10() : 0);
    this.history.set(this.historyBuffer.toArray());
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
    const offLocale = locale.subscribe((lang) => {
      setNumberLocale(lang);
      this.publish();
    });
    const offSettings = settings.subscribe((s) => {
      setNotation(s.notation);
      audio.apply(s);
      document.documentElement.toggleAttribute("data-reduce-motion", s.reduceMotion);
      if (this.autosaveHandle !== null) clearInterval(this.autosaveHandle);
      this.autosaveHandle = setInterval(() => this.save(), s.autosaveSeconds * 1000);
      this.publish();
    });
    this.unsubscribeSettings = () => {
      offLocale();
      offSettings();
    };
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("beforeunload", this.onUnload);
  }

  stop(): void {
    this.stopLoop?.();
    this.stopLoop = null;
    this.unsubscribeSettings();
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
      writeSave(this.storage, this.sim.view, this.currentSlot);
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

  /** Kurzinfo aller Speicherplätze für die Auswahl in der Chronik. */
  slotSummaries(): SlotSummary[] {
    return ([1, 2, 3] as const).map((n) =>
      n === this.currentSlot
        ? { slot: n, kind: "loaded" as const, playSeconds: this.sim.view.stats.playSeconds, act: this.act(), ngPlus: this.sim.view.meta.ngPlus }
        : this.cachedSummary(n),
    );
  }

  private cachedSummary(slot: SlotNumber): SlotSummary {
    let summary = this.slotCache.get(slot);
    if (!summary) {
      summary = summarizeSlot(this.storage, slot, this.clock());
      this.slotCache.set(slot, summary);
    }
    return summary;
  }

  private act(): number {
    const f = this.sim.view.flags;
    return 1 + [f.act1Complete, f.act2Complete, f.act3Complete, f.act4Complete].filter(Boolean).length;
  }

  /** Sichert den aktuellen Platz und lädt den gewählten (leer = neues Spiel). */
  switchSlot(slot: SlotNumber): void {
    if (slot === this.currentSlot) return;
    this.save();
    this.slotCache.clear();
    this.currentSlot = slot;
    this.slot.set(slot);
    this.storage.setItem(SLOT_KEY, String(slot));
    const now = this.clock();
    const loaded = readSave(this.storage, now, slot);
    this.storyQueue.set([]);
    this.sim = this.attach(loaded.kind === "loaded" ? loaded.state : createInitialState(now));
    const report = loaded.kind === "loaded" ? applyOfflineProgress(this.sim, now) : null;
    this.save();
    this.publish();
    if (loaded.kind === "corrupt") this.notice.set({ kind: "error", message: loaded.error.message });
    else if (report) this.notice.set({ kind: "offline", report });
  }

  reset(): void {
    this.storage.removeItem(slotKey(this.currentSlot));
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
