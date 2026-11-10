import { Decimal } from "../core/decimal";
import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { RECIPES, type RecipeId } from "../content/balance";
import type { ResourceId } from "../content/ids";
import { craftDuration, forgeCapacity } from "./rates";
import { type GameState, gain, spend } from "./state";

const ONE = new Decimal(1);

function inputEntries(recipe: RecipeId): readonly (readonly [ResourceId, number])[] {
  return Object.entries(RECIPES[recipe].inputs) as [ResourceId, number][];
}

export function canAffordRecipe(state: DeepReadonly<GameState>, recipe: RecipeId, amount: number): boolean {
  return inputEntries(recipe).every(([res, cost]) => state.resources[res].gte(cost * amount));
}

export function enqueueCraft(state: GameState, recipe: RecipeId, amount: number): Result {
  if (!Number.isSafeInteger(amount) || amount < 1) return fail(`Ungültige Menge: ${amount}`);
  const def = RECIPES[recipe];
  if (!state.tiles[def.tile]) return fail("Die Schmiede ist noch nicht zugänglich.");
  if (state.forge.queue.length + amount > forgeCapacity(state)) return fail("Die Warteschlange der Schmiede ist voll.");
  if (!canAffordRecipe(state, recipe, amount)) return fail(`Nicht genug Rohstoffe für ${def.name}.`);

  for (const [res, cost] of inputEntries(recipe)) spend(state, res, new Decimal(cost * amount));
  for (let i = 0; i < amount; i += 1) state.forge.queue.push(recipe);
  return OK;
}

/** Arbeitet die Warteschlange ab. Gibt true zurück, wenn ein Erzeugnis fertig wurde (Raten ändern sich). */
export function tickForge(state: GameState, dt: number): boolean {
  let remaining = dt;
  let produced = false;
  const forge = state.forge;

  while (remaining > 0) {
    const recipe = forge.queue[0];
    if (recipe === undefined) {
      forge.progress = 0;
      break;
    }
    const needed = craftDuration(state, recipe) - forge.progress;
    if (remaining < needed) {
      forge.progress += remaining;
      break;
    }
    remaining -= needed;
    forge.progress = 0;
    forge.queue.shift();
    gain(state, RECIPES[recipe].output, ONE);
    produced = true;
  }
  return produced;
}
