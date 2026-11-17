import { Decimal } from "../core/decimal";
import { type DeepReadonly, recordFrom } from "../core/types";
import { BUILDING_IDS, OFFLINE_CAP_SECONDS, OFFLINE_EFFICIENCY, OFFLINE_MIN_SECONDS } from "../content/balance";
import { RESOURCE_IDS, type ResourceId } from "../content/ids";
import type { AchievementId } from "../content/achievements";
import type { CodexId } from "../content/extensions";
import type { Simulation } from "./simulation";
import type { GameState } from "./state";

export interface CatchUpReport {
  readonly awaySeconds: number;
  readonly simulatedSeconds: number;
  readonly gains: Readonly<Record<ResourceId, Decimal>>;
  /** Abgeschlossene Expeditionen, Forschungen und Schlachten. */
  readonly completions: Readonly<{ expedition: number; research: number; battle: number }>;
  /** Neu erreichte Story-Knoten in Reihenfolge. */
  readonly story: readonly string[];
  readonly achievements: readonly AchievementId[];
  readonly codex: readonly CodexId[];
  /** Zusätzlich gebaute Gebäude (Verwalter und Automaten). */
  readonly buildings: number;
  /** Ein Ereignis wartet auf eine Entscheidung. */
  readonly eventPending: boolean;
}

const STEP_SECONDS = 1;
/** Ab dieser simulierten Dauer lohnt der Zeitraffer im Hintergrund-Thread. */
export const TIMELAPSE_MIN_SECONDS = 10 * 60;

/** Effizienz und Obergrenze; das Talent „Ewige Wacht“ hebt beide an. */
export function offlineParams(state: DeepReadonly<GameState>): { efficiency: number; cap: number } {
  return state.meta.talents.vigil ? { efficiency: 1, cap: OFFLINE_CAP_SECONDS * 2 } : { efficiency: OFFLINE_EFFICIENCY, cap: OFFLINE_CAP_SECONDS };
}

const buildingCount = (sim: Simulation): number => BUILDING_IDS.reduce((sum, id) => sum + sim.view.buildings[id], 0);

/**
 * Simuliert verpasste Zeit in 1-s-Schritten (O(simulatedSeconds)), damit Schmiede, Automaten
 * und Story-Trigger korrekt mitlaufen, und sammelt dabei den Bericht. `onProgress` wird nach
 * jedem Block von `chunkSeconds` aufgerufen (Zeitraffer-Anzeige).
 */
export function catchUp(
  sim: Simulation,
  awaySeconds: number,
  efficiency: number,
  cap: number = OFFLINE_CAP_SECONDS,
  onProgress?: (done: number, total: number) => void,
  chunkSeconds = 600,
): CatchUpReport {
  if (!(efficiency > 0 && efficiency <= 1)) throw new RangeError(`efficiency muss in (0, 1] liegen, war ${efficiency}`);
  const away = Math.max(0, awaySeconds);
  const simulated = Math.min(away, cap) * efficiency;
  const before = recordFrom(RESOURCE_IDS, (r) => sim.view.resources[r]);
  const buildingsBefore = buildingCount(sim);
  const completions = { expedition: 0, research: 0, battle: 0 };
  const story: string[] = [];
  const achievements: AchievementId[] = [];
  const codex: CodexId[] = [];
  const offs = [
    sim.events.on("completed", (c) => (completions[c.kind] += 1)),
    sim.events.on("story", (node) => story.push(node.id)),
    sim.events.on("achievement", (id) => achievements.push(id)),
    sim.events.on("codex", (id) => codex.push(id)),
  ];

  try {
    let done = 0;
    while (simulated - done >= STEP_SECONDS) {
      sim.tick(STEP_SECONDS);
      done += STEP_SECONDS;
      if (onProgress && done % chunkSeconds === 0) onProgress(done, simulated);
    }
    if (simulated - done > 0) sim.tick(simulated - done);
    onProgress?.(simulated, simulated);
  } finally {
    for (const off of offs) off();
  }

  const gains = recordFrom(RESOURCE_IDS, (r) => Decimal.max(sim.view.resources[r].sub(before[r]), 0));
  return {
    awaySeconds: away,
    simulatedSeconds: simulated,
    gains,
    completions,
    story,
    achievements,
    codex,
    buildings: Math.max(0, buildingCount(sim) - buildingsBefore),
    eventPending: sim.view.events.pending !== null,
  };
}

/** Abwesenheit in Sekunden, oder null, wenn sich keine Meldung lohnt. */
export function awaySeconds(state: DeepReadonly<GameState>, now: number): number | null {
  const away = (now - state.lastSeen) / 1000;
  return away >= OFFLINE_MIN_SECONDS ? away : null;
}

/** Offline-Fortschritt beim Laden: unter OFFLINE_MIN_SECONDS lohnt keine Meldung. */
export function applyOfflineProgress(sim: Simulation, now: number): CatchUpReport | null {
  const away = awaySeconds(sim.view, now);
  if (away === null) return null;
  const { efficiency, cap } = offlineParams(sim.view);
  return catchUp(sim, away, efficiency, cap);
}

/** JSON-taugliche Form für die Übergabe aus dem Worker. */
export type PlainReport = Omit<CatchUpReport, "gains"> & { readonly gains: Readonly<Record<ResourceId, string>> };

export const reportToPlain = (r: CatchUpReport): PlainReport => ({ ...r, gains: recordFrom(RESOURCE_IDS, (k) => r.gains[k].toString()) });
export const reportFromPlain = (r: PlainReport): CatchUpReport => ({ ...r, gains: recordFrom(RESOURCE_IDS, (k) => new Decimal(r.gains[k])) });
