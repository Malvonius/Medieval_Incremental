import { Decimal, ZERO } from "../core/decimal";
import type { DeepReadonly } from "../core/types";
import { recordFrom } from "../core/types";
import { bulkCost } from "../core/economy";
import {
  BUILDINGS,
  BUILDING_IDS,
  type BuildingId,
  CLICK_BASE_GOLD,
  EXPEDITIONS,
  EXPEDITION_SLOTS,
  type ExpeditionId,
  FORGE_QUEUE_CAPACITY,
  INTEL_PER_INTERROGATION,
  LABOR_GOLD_BONUS,
  LABOR_IRON_BONUS,
  RECIPES,
  RECRUIT_COST,
  type RecipeId,
  SEAL_BONUS,
  SWORD_GOLD_BONUS,
  UPGRADES,
  UPGRADE_IDS,
  type UpgradeEffect,
  type UpgradeId,
} from "../content/balance";
import { RESOURCE_IDS, type ResourceId } from "../content/ids";
import { type GameState, aliveSoldiers } from "./state";

export type Rates = Readonly<Record<ResourceId, Decimal>>;
type View = DeepReadonly<GameState>;
type EffectKind = UpgradeEffect["kind"];
type EffectOf<K extends EffectKind> = Extract<UpgradeEffect, { kind: K }>;

/** Einmalig nach Art indizierte Upgrade-Effekte, damit keine Berechnung alle Upgrades scannt. */
const EFFECTS_BY_KIND: ReadonlyMap<EffectKind, readonly { id: UpgradeId; effect: UpgradeEffect }[]> = (() => {
  const map = new Map<EffectKind, { id: UpgradeId; effect: UpgradeEffect }[]>();
  for (const id of UPGRADE_IDS) {
    const effect: UpgradeEffect = UPGRADES[id].effect;
    const list = map.get(effect.kind) ?? [];
    list.push({ id, effect });
    map.set(effect.kind, list);
  }
  return map;
})();

function* ownedEffects<K extends EffectKind>(state: View, kind: K): Generator<EffectOf<K>> {
  for (const { id, effect } of EFFECTS_BY_KIND.get(kind) ?? []) {
    if (state.upgrades[id]) yield effect as EffectOf<K>;
  }
}

const productOf = <K extends EffectKind>(state: View, kind: K, pick: (e: EffectOf<K>) => number | null): number => {
  let result = 1;
  for (const effect of ownedEffects(state, kind)) result *= pick(effect) ?? 1;
  return result;
};

const sumOf = <K extends EffectKind>(state: View, kind: K, pick: (e: EffectOf<K>) => number): number => {
  let result = 0;
  for (const effect of ownedEffects(state, kind)) result += pick(effect);
  return result;
};

export const buildingMultiplier = (state: View, building: BuildingId): number =>
  productOf(state, "buildingMult", (e) => (e.building === building ? e.factor : null));

export const laborMultiplier = (state: View): number => productOf(state, "laborBonus", (e) => e.factor);

/** Goldbonus durch Bewaffnung als Anteil: Schwerter in der Waffenkammer plus lebende Soldaten. */
export const armedBonus = (state: View): number =>
  state.resources.swords.add(aliveSoldiers(state)).toNumber() * SWORD_GOLD_BONUS;

/** Globale Multiplikatoren je Ressource: Waffen & Soldaten, Ordenssiegel, Fronarbeit. */
export function resourceMultiplier(state: View, resource: ResourceId): Decimal {
  const seals = 1 + state.warroom.seals * SEAL_BONUS;
  const labor = state.dungeon.laborers * laborMultiplier(state);
  switch (resource) {
    case "gold": {
      const armed = state.resources.swords.add(aliveSoldiers(state)).mul(SWORD_GOLD_BONUS).add(1);
      return armed.mul(seals * (1 + labor * LABOR_GOLD_BONUS));
    }
    case "iron":
      return new Decimal(seals * (1 + labor * LABOR_IRON_BONUS));
    case "swords":
      return new Decimal(1);
  }
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

export const clickValue = (state: View): Decimal =>
  resourceMultiplier(state, "gold").mul(CLICK_BASE_GOLD * productOf(state, "clickMult", (e) => e.factor));

export const craftDuration = (state: View, recipe: RecipeId): number =>
  RECIPES[recipe].durationSeconds / productOf(state, "craftSpeed", (e) => (e.recipe === recipe ? e.factor : null));

export const forgeCapacity = (state: View): number => FORGE_QUEUE_CAPACITY + sumOf(state, "queueCapacity", (e) => e.add);

export const expeditionDuration = (state: View, id: ExpeditionId): number =>
  EXPEDITIONS[id].durationSeconds / productOf(state, "expeditionSpeed", (e) => e.factor);

export const expeditionSlots = (state: View): number => EXPEDITION_SLOTS + sumOf(state, "expeditionSlots", (e) => e.add);

/** Gefallene einer Expedition: abgerundet, damit kleine Trupps verlustfrei bleiben können. */
export const expeditionLosses = (state: View, id: ExpeditionId, sent: number): number =>
  Math.floor(sent * EXPEDITIONS[id].lossRate * productOf(state, "expeditionLosses", (e) => e.factor));

export const intelPerInterrogation = (state: View): number =>
  INTEL_PER_INTERROGATION + sumOf(state, "intelYield", (e) => e.add);

export const recruitCost = (state: View, amount: number): Decimal =>
  bulkCost(RECRUIT_COST, aliveSoldiers(state), amount);

export const buildingCost = (state: View, building: BuildingId, amount: number): Decimal =>
  bulkCost(BUILDINGS[building].cost, state.buildings[building], amount);

export function isBuildingVisible(state: View, building: BuildingId): boolean {
  const def = BUILDINGS[building];
  return state.tiles[def.tile] && (def.requiresFlag === null || state.flags[def.requiresFlag]);
}

export function isUpgradeVisible(state: View, upgrade: UpgradeId): boolean {
  const def = UPGRADES[upgrade];
  if (!state.tiles[def.tile] || state.upgrades[upgrade]) return false;
  if (def.requiresFlag !== null && !state.flags[def.requiresFlag]) return false;
  const req = def.requires;
  return req === null || state.buildings[req.building] >= req.count;
}
