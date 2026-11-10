import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { maxAffordable } from "../core/economy";
import { BUILDINGS, type BuildingId, type RecipeId, UPGRADES, type UpgradeId } from "../content/balance";
import { enqueueCraft } from "./forge";
import { buildingCost, clickValue, isUpgradeVisible } from "./rates";
import { type GameState, gain, spend } from "./state";
import { Decimal } from "../core/decimal";

export type BuyAmount = number | "max";

export type Action =
  | { readonly type: "collect" }
  | { readonly type: "buyBuilding"; readonly building: BuildingId; readonly amount: BuyAmount }
  | { readonly type: "buyUpgrade"; readonly upgrade: UpgradeId }
  | { readonly type: "craft"; readonly recipe: RecipeId; readonly amount: number };

export function resolveBuyAmount(state: DeepReadonly<GameState>, building: BuildingId, amount: BuyAmount): number {
  if (amount !== "max") return amount;
  const def = BUILDINGS[building];
  return maxAffordable(def.cost, state.buildings[building], state.resources[def.costResource]);
}

function buyBuilding(state: GameState, building: BuildingId, requested: BuyAmount): Result {
  const def = BUILDINGS[building];
  if (!state.tiles[def.tile]) return fail(`${def.name} ist noch nicht verfügbar.`);
  const amount = resolveBuyAmount(state, building, requested);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    return requested === "max" ? fail("Nicht genug Gold.") : fail(`Ungültige Menge: ${amount}`);
  }
  const cost = buildingCost(state, building, amount);
  if (state.resources[def.costResource].lt(cost)) return fail("Nicht genug Gold.");
  spend(state, def.costResource, cost);
  state.buildings[building] += amount;
  return OK;
}

function buyUpgrade(state: GameState, upgrade: UpgradeId): Result {
  const def = UPGRADES[upgrade];
  if (state.upgrades[upgrade]) return fail(`${def.name} ist bereits erworben.`);
  if (!isUpgradeVisible(state, upgrade)) return fail(`${def.name} ist noch nicht verfügbar.`);
  const cost = new Decimal(def.cost);
  if (state.resources[def.costResource].lt(cost)) return fail("Nicht genug Gold.");
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
    default: {
      const unreachable: never = action;
      throw new Error(`Unbekannte Aktion: ${JSON.stringify(unreachable)}`);
    }
  }
}
