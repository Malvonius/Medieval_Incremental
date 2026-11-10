import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { maxAffordable } from "../core/economy";
import {
  BUILDINGS,
  type BuildingId,
  type EndingId,
  type ExpeditionId,
  type FortificationId,
  type RecipeId,
  type ResearchId,
  UPGRADES,
  type UpgradeId,
  type VowId,
} from "../content/balance";
import { breakVow, swearVow } from "./chapel";
import { performRitual } from "./ritual";
import { buildFortification, chooseEnding, startBattle } from "./siege";
import type { ResourceId } from "../content/ids";
import { startResearch } from "./alchemy";
import { forceLabor, interrogate } from "./dungeon";
import { launchExpedition, recruit } from "./warroom";
import { enqueueCraft } from "./forge";
import { buildingCost, clickValue, isBuildingVisible, isUpgradeVisible } from "./rates";
import { type GameState, gain, spend } from "./state";
import { Decimal } from "../core/decimal";

export type BuyAmount = number | "max";

const NOT_ENOUGH: Readonly<Record<ResourceId, string>> = {
  gold: "Nicht genug Gold.",
  iron: "Nicht genug Eisen.",
  swords: "Nicht genug Schwerter.",
  souls: "Nicht genug Seelen.",
  faith: "Nicht genug Glauben.",
};
const notEnough = (resource: ResourceId): string => NOT_ENOUGH[resource];

export type Action =
  | { readonly type: "collect" }
  | { readonly type: "buyBuilding"; readonly building: BuildingId; readonly amount: BuyAmount }
  | { readonly type: "buyUpgrade"; readonly upgrade: UpgradeId }
  | { readonly type: "craft"; readonly recipe: RecipeId; readonly amount: number }
  | { readonly type: "recruit"; readonly amount: number }
  | { readonly type: "launchExpedition"; readonly expedition: ExpeditionId }
  | { readonly type: "interrogate"; readonly amount: number }
  | { readonly type: "forceLabor"; readonly amount: number }
  | { readonly type: "research"; readonly research: ResearchId }
  | { readonly type: "swearVow"; readonly vow: VowId }
  | { readonly type: "breakVow"; readonly vow: VowId }
  | { readonly type: "ritual" }
  | { readonly type: "buildFortification"; readonly fortification: FortificationId; readonly amount: number }
  | { readonly type: "battle" }
  | { readonly type: "chooseEnding"; readonly ending: EndingId };

export function resolveBuyAmount(state: DeepReadonly<GameState>, building: BuildingId, amount: BuyAmount): number {
  if (amount !== "max") return amount;
  const def = BUILDINGS[building];
  return maxAffordable(def.cost, state.buildings[building], state.resources[def.costResource]);
}

function buyBuilding(state: GameState, building: BuildingId, requested: BuyAmount): Result {
  const def = BUILDINGS[building];
  if (!isBuildingVisible(state, building)) return fail(`${def.name} ist noch nicht verfügbar.`);
  const amount = resolveBuyAmount(state, building, requested);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    return requested === "max" ? fail(notEnough(def.costResource)) : fail(`Ungültige Menge: ${amount}`);
  }
  const cost = buildingCost(state, building, amount);
  if (state.resources[def.costResource].lt(cost)) return fail(notEnough(def.costResource));
  spend(state, def.costResource, cost);
  state.buildings[building] += amount;
  return OK;
}

function buyUpgrade(state: GameState, upgrade: UpgradeId): Result {
  const def = UPGRADES[upgrade];
  if (state.upgrades[upgrade]) return fail(`${def.name} ist bereits erworben.`);
  if (!isUpgradeVisible(state, upgrade)) return fail(`${def.name} ist noch nicht verfügbar.`);
  const cost = new Decimal(def.cost);
  if (state.resources[def.costResource].lt(cost)) return fail(notEnough(def.costResource));
  spend(state, def.costResource, cost);
  state.upgrades[upgrade] = true;
  return OK;
}

function collect(state: GameState): Result {
  if (!state.tiles.keep) return fail("Der Burgfried ist noch nicht zugänglich.");
  gain(state, "gold", clickValue(state));
  state.stats.clicks += 1;
  return OK;
}

export function applyAction(state: GameState, action: Action): Result {
  switch (action.type) {
    case "collect":
      return collect(state);
    case "buyBuilding":
      return buyBuilding(state, action.building, action.amount);
    case "buyUpgrade":
      return buyUpgrade(state, action.upgrade);
    case "craft":
      return enqueueCraft(state, action.recipe, action.amount);
    case "recruit":
      return recruit(state, action.amount);
    case "launchExpedition":
      return launchExpedition(state, action.expedition);
    case "interrogate":
      return interrogate(state, action.amount);
    case "forceLabor":
      return forceLabor(state, action.amount);
    case "research":
      return startResearch(state, action.research);
    case "swearVow":
      return swearVow(state, action.vow);
    case "breakVow":
      return breakVow(state, action.vow);
    case "ritual":
      return performRitual(state);
    case "buildFortification":
      return buildFortification(state, action.fortification, action.amount);
    case "battle":
      return startBattle(state);
    case "chooseEnding":
      return chooseEnding(state, action.ending);
    default: {
      const unreachable: never = action;
      throw new Error(`Unbekannte Aktion: ${JSON.stringify(unreachable)}`);
    }
  }
}
