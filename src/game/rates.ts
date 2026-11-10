import { Decimal, ZERO } from "../core/decimal";
import type { DeepReadonly } from "../core/types";
import { recordFrom } from "../core/types";
import { bulkCost } from "../core/economy";
import {
  BUILDINGS,
  BUILDING_IDS,
  type BuildingId,
  CLICK_BASE_GOLD,
  RECIPES,
  type RecipeId,
  SWORD_GOLD_BONUS,
  UPGRADES,
  UPGRADE_IDS,
  type UpgradeEffect,
  type UpgradeId,
} from "../content/balance";
import { RESOURCE_IDS, type ResourceId } from "../content/ids";
import type { GameState } from "./state";

export type Rates = Readonly<Record<ResourceId, Decimal>>;
type View = DeepReadonly<GameState>;

/** Einmalig indizierte Upgrade-Effekte, damit die Ratenberechnung nicht alle Upgrades scannt. */
const effectsOf = <K extends UpgradeEffect["kind"]>(kind: K) =>
  UPGRADE_IDS.flatMap((id) => {
    const effect: UpgradeEffect = UPGRADES[id].effect;
    return effect.kind === kind ? [{ id, effect: effect as Extract<UpgradeEffect, { kind: K }> }] : [];
  });

const BUILDING_EFFECTS = effectsOf("buildingMult");
const CLICK_EFFECTS = effectsOf("clickMult");
const CRAFT_EFFECTS = effectsOf("craftSpeed");

export function buildingMultiplier(state: View, building: BuildingId): number {
  let mult = 1;
  for (const { id, effect } of BUILDING_EFFECTS) {
    if (effect.building === building && state.upgrades[id]) mult *= effect.factor;
  }
  return mult;
}

export function resourceMultiplier(state: View, resource: ResourceId): Decimal {
  if (resource === "gold") return state.resources.swords.mul(SWORD_GOLD_BONUS).add(1);
  return new Decimal(1);
}

/** Produktion einer einzelnen zusätzlichen Einheit pro Sekunde (inkl. aller Multiplikatoren). */
export function unitRate(state: View, building: BuildingId): Decimal {
  const def = BUILDINGS[building];
  return resourceMultiplier(state, def.produces).mul(def.baseRate * buildingMultiplier(state, building));
}

export function computeRates(state: View): Rates {
  const rates = recordFrom(RESOURCE_IDS, () => ZERO);
  for (const id of BUILDING_IDS) {
    const count = state.buildings[id];
    if (count === 0) continue;
    const def = BUILDINGS[id];
    rates[def.produces] = rates[def.produces].add(def.baseRate * count * buildingMultiplier(state, id));
  }
  for (const resource of RESOURCE_IDS) rates[resource] = rates[resource].mul(resourceMultiplier(state, resource));
  return rates;
}

export function clickValue(state: View): Decimal {
  let mult = 1;
  for (const { id, effect } of CLICK_EFFECTS) if (state.upgrades[id]) mult *= effect.factor;
  return resourceMultiplier(state, "gold").mul(CLICK_BASE_GOLD * mult);
}

export function craftDuration(state: View, recipe: RecipeId): number {
  let speed = 1;
  for (const { id, effect } of CRAFT_EFFECTS) if (effect.recipe === recipe && state.upgrades[id]) speed *= effect.factor;
  return RECIPES[recipe].durationSeconds / speed;
}

export const buildingCost = (state: View, building: BuildingId, amount: number): Decimal =>
  bulkCost(BUILDINGS[building].cost, state.buildings[building], amount);

export function isUpgradeVisible(state: View, upgrade: UpgradeId): boolean {
  const def = UPGRADES[upgrade];
  if (!state.tiles[def.tile] || state.upgrades[upgrade]) return false;
  const req = def.requires;
  return req === null || state.buildings[req.building] >= req.count;
}
