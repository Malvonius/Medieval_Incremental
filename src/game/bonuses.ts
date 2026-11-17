import type { DeepReadonly } from "../core/types";
import type { ResourceId } from "../content/ids";
import {
  FACTION_IDS,
  type FactionId,
  REPUTATION_MAX,
  REPUTATION_MIN,
  MAP,
  MAP_TILE_BONUS,
  OFFICES,
  RETAINERS,
  RETAINER_EQUIP_FACTOR,
  RETAINER_IDS,
  RETAINER_LEVEL_BONUS,
  TERRAINS,
} from "../content/extensions";
import type { GameState } from "./state";

const clampRep = (value: number): number => Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, value));

/** Ändert den Ruf, begrenzt auf [-100, 100]. */
export function adjustReputation(state: GameState, deltas: Readonly<Partial<Record<FactionId, number>>>): void {
  for (const id of FACTION_IDS) {
    const delta = deltas[id];
    if (delta !== undefined) state.factions.rep[id] = clampRep(state.factions.rep[id] + delta);
  }
}

type View = DeepReadonly<GameState>;

/**
 * Ressourcen-Multiplikatoren der Erweiterungen ohne Abhängigkeit von rates.ts,
 * damit rates.ts sie importieren kann, ohne einen Zyklus zu bilden.
 */

/** Gefolge: Summe der Amtsboni aller Gefolgsleute im Amt dieser Ressource. */
export function retinueFactor(state: View, resource: ResourceId): number {
  let bonus = 0;
  for (const id of RETAINER_IDS) {
    const r = state.retinue[id];
    if (r === null || r.office === null || OFFICES[r.office].resource !== resource) continue;
    const affinity = RETAINERS[id].affinity === r.office ? 2 : 1;
    bonus += r.level * RETAINER_LEVEL_BONUS * affinity * (r.equipped ? RETAINER_EQUIP_FACTOR : 1);
  }
  return 1 + bonus;
}

/** Ländereien: jedes eroberte Feld des passenden Geländes bringt +8 %. */
export function landFactor(state: View, resource: ResourceId): number {
  let count = 0;
  for (const index of state.map.owned) {
    const terrain = MAP[index];
    if (terrain !== undefined && TERRAINS[terrain].resource === resource) count += 1;
  }
  return 1 + count * MAP_TILE_BONUS;
}
