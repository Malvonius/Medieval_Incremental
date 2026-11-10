import { Decimal } from "../core/decimal";
import { recordFrom } from "../core/types";
import { OFFLINE_CAP_SECONDS, OFFLINE_EFFICIENCY, OFFLINE_MIN_SECONDS } from "../content/balance";
import { RESOURCE_IDS, type ResourceId } from "../content/ids";
import type { Simulation } from "./simulation";

export interface CatchUpReport {
  readonly awaySeconds: number;
  readonly simulatedSeconds: number;
  readonly gains: Readonly<Record<ResourceId, Decimal>>;
}

const STEP_SECONDS = 1;

/**
 * Simuliert verpasste Zeit in 1-s-Schritten (O(simulatedSeconds)), damit Schmiede
 * und Story-Trigger korrekt mitlaufen. Gedeckelt durch OFFLINE_CAP_SECONDS.
 */
export function catchUp(sim: Simulation, awaySeconds: number, efficiency: number): CatchUpReport {
  if (!(efficiency > 0 && efficiency <= 1)) throw new RangeError(`efficiency muss in (0, 1] liegen, war ${efficiency}`);
  const away = Math.max(0, awaySeconds);
  const simulated = Math.min(away, OFFLINE_CAP_SECONDS) * efficiency;
  const before = recordFrom(RESOURCE_IDS, (r) => sim.view.resources[r]);

  let remaining = simulated;
  while (remaining >= STEP_SECONDS) {
    sim.tick(STEP_SECONDS);
    remaining -= STEP_SECONDS;
  }
  if (remaining > 0) sim.tick(remaining);

  const gains = recordFrom(RESOURCE_IDS, (r) => Decimal.max(sim.view.resources[r].sub(before[r]), 0));
  return { awaySeconds: away, simulatedSeconds: simulated, gains };
}

/** Offline-Fortschritt beim Laden: unter OFFLINE_MIN_SECONDS lohnt keine Meldung. */
export function applyOfflineProgress(sim: Simulation, now: number): CatchUpReport | null {
  const awaySeconds = (now - sim.view.lastSeen) / 1000;
  if (!(awaySeconds >= OFFLINE_MIN_SECONDS)) return null;
  return catchUp(sim, awaySeconds, OFFLINE_EFFICIENCY);
}
