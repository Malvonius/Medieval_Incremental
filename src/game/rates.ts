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
  ASH_BONUS,
  FALLEN_SOUL_RATE,
  FORTIFICATIONS,
  FORTIFICATION_IDS,
  type FortificationId,
  RECRUIT_COST,
  RESEARCH,
  RESEARCH_IDS,
  type RecipeId,
  SEAL_BONUS,
  SOLDIER_DEFENSE,
  SWORD_GOLD_BONUS,
  UPGRADES,
  UPGRADE_IDS,
  type UpgradeEffect,
  type UpgradeId,
  VOWS,
  VOW_IDS,
  VOW_SLOTS,
} from "../content/balance";
import { RESOURCE_IDS, type ResourceId } from "../content/ids";
import { achievementMultiplier } from "./achievements";
import { CHALLENGES, CHALLENGE_IDS, DECISIONS, DECISION_IDS, MEMORY_BONUS, SYNERGIES } from "../content/depth";
import { type GameState, aliveSoldiers } from "./state";

export type Rates = Readonly<Record<ResourceId, Decimal>>;
type View = DeepReadonly<GameState>;
type EffectKind = UpgradeEffect["kind"];
type EffectOf<K extends EffectKind> = Extract<UpgradeEffect, { kind: K }>;

interface EffectSource {
  readonly owned: (state: View) => boolean;
  readonly effect: UpgradeEffect;
}

/**
 * Einmalig nach Art indizierte Effekte aus Upgrades und Forschung,
 * damit keine Berechnung alle Quellen scannen muss.
 */
const EFFECTS_BY_KIND: ReadonlyMap<EffectKind, readonly EffectSource[]> = (() => {
  const map = new Map<EffectKind, EffectSource[]>();
  const add = (source: EffectSource): void => {
    const list = map.get(source.effect.kind) ?? [];
    list.push(source);
    map.set(source.effect.kind, list);
  };
  for (const id of UPGRADE_IDS) add({ owned: (s) => s.upgrades[id], effect: UPGRADES[id].effect });
  for (const id of RESEARCH_IDS) add({ owned: (s) => s.alchemy.completed[id], effect: RESEARCH[id].effect });
  for (const id of VOW_IDS) for (const effect of VOWS[id].effects) add({ owned: (s) => s.chapel.vows[id], effect });
  for (const { vows: [a, b], effect } of SYNERGIES) add({ owned: (s) => s.chapel.vows[a] && s.chapel.vows[b], effect });
  for (const id of CHALLENGE_IDS) {
    for (const effect of CHALLENGES[id].restrictions) add({ owned: (s) => s.meta.challenge === id, effect });
    add({ owned: (s) => s.meta.challengesDone[id], effect: CHALLENGES[id].reward });
  }
  for (const id of DECISION_IDS) for (const option of DECISIONS[id].options) add({ owned: (s) => s.flags[option.flag], effect: option.effect });
  return map;
})();

function* ownedEffects<K extends EffectKind>(state: View, kind: K): Generator<EffectOf<K>> {
  for (const { owned, effect } of EFFECTS_BY_KIND.get(kind) ?? []) {
    if (owned(state)) yield effect as EffectOf<K>;
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

/** Multiplikator aus Pakten und Forschung für eine Ressource. */
export const pactMultiplier = (state: View, resource: ResourceId): number =>
  productOf(state, "resourceMult", (e) => (e.resource === resource ? e.factor : null));

export const memoryMultiplier = (state: View): number => 1 + state.meta.memories * MEMORY_BONUS;

export const ashMultiplier = (state: View): number => 1 + state.ritual.ash * ASH_BONUS;

/** Globale Multiplikatoren je Ressource: Waffen & Soldaten, Siegel, Fronarbeit, Pakte, Forschung, Gelübde, Asche. */
export function resourceMultiplier(state: View, resource: ResourceId): Decimal {
  const seals = 1 + state.warroom.seals * SEAL_BONUS;
  const labor = state.dungeon.laborers * laborMultiplier(state);
  const buff = state.events.buff;
  const temporary = buff !== null && buff.resource === resource ? buff.factor : 1;
  const pacts =
    pactMultiplier(state, resource) *
    temporary *
    (resource === "swords" ? 1 : ashMultiplier(state) * achievementMultiplier(state) * memoryMultiplier(state));
  switch (resource) {
    case "gold": {
      const armed = state.resources.swords.add(aliveSoldiers(state)).mul(SWORD_GOLD_BONUS).add(1);
      return armed.mul(seals * (1 + labor * LABOR_GOLD_BONUS) * pacts);
    }
    case "iron":
      return new Decimal(seals * (1 + labor * LABOR_IRON_BONUS) * pacts);
    case "souls":
    case "faith":
    case "swords":
      return new Decimal(pacts);
  }
}

/** Seelen, die von den Gefallenen in die Krypta strömen (vor Multiplikatoren). */
export const fallenSoulBase = (state: View): number =>
  state.tiles.crypt ? state.warroom.fallen * FALLEN_SOUL_RATE : 0;

/** Produktion einer einzelnen zusätzlichen Einheit pro Sekunde (inkl. aller Multiplikatoren). */
export function unitRate(state: View, building: BuildingId): Decimal {
  const def = BUILDINGS[building];
  return resourceMultiplier(state, def.produces).mul(def.baseRate * buildingMultiplier(state, building));
}

export function computeRates(state: View): Rates {
  const rates = recordFrom(RESOURCE_IDS, () => ZERO);
  rates.souls = new Decimal(fallenSoulBase(state));
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

export const defenseMultiplier = (state: View): number => productOf(state, "defenseMult", (e) => e.factor);

/** Wehrkraft: Soldaten in der Burg plus Befestigungen, mal Upgrades und Ordenssiegel. */
export function defense(state: View): number {
  let base = state.warroom.soldiers * SOLDIER_DEFENSE;
  for (const id of FORTIFICATION_IDS) base += state.siege.fortifications[id] * FORTIFICATIONS[id].defense;
  return base * defenseMultiplier(state) * (1 + state.warroom.seals * SEAL_BONUS);
}

export const fortificationCost = (state: View, id: FortificationId, amount: number): Decimal =>
  bulkCost(FORTIFICATIONS[id].cost, state.siege.fortifications[id], amount);

export const vowSlots = (state: View): number => VOW_SLOTS + sumOf(state, "vowSlots", (e) => e.add);

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
