import type { DeepReadonly } from "../core/types";
import { BUILDINGS, BUILDING_IDS, type BuildingId, UPGRADES, UPGRADE_IDS, type UpgradeId } from "../content/balance";
import type { TileId } from "../content/ids";
import { buildingCost, isBuildingVisible, isUpgradeVisible } from "./rates";
import type { GameState } from "./state";

const byTile = <K extends string>(ids: readonly K[], tileOf: (id: K) => TileId): ReadonlyMap<TileId, readonly K[]> => {
  const map = new Map<TileId, K[]>();
  for (const id of ids) map.set(tileOf(id), [...(map.get(tileOf(id)) ?? []), id]);
  return map;
};

const BUILDINGS_BY_TILE = byTile<BuildingId>(BUILDING_IDS, (id) => BUILDINGS[id].tile);
const UPGRADES_BY_TILE = byTile<UpgradeId>(UPGRADE_IDS, (id) => UPGRADES[id].tile);

/** Gibt es auf dieser Kachel einen bezahlbaren Kauf? Treibt das Pulsieren im Kachelmenü. */
export function hasAffordable(state: DeepReadonly<GameState>, tile: TileId): boolean {
  if (!state.tiles[tile]) return false;
  for (const id of UPGRADES_BY_TILE.get(tile) ?? []) {
    const def = UPGRADES[id];
    if (isUpgradeVisible(state, id) && state.resources[def.costResource].gte(def.cost)) return true;
  }
  for (const id of BUILDINGS_BY_TILE.get(tile) ?? []) {
    if (isBuildingVisible(state, id) && state.resources[BUILDINGS[id].costResource].gte(buildingCost(state, id, 1))) return true;
  }
  return false;
}
