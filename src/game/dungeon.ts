import { type Result, OK, fail } from "../core/types";
import { intelPerInterrogation } from "./rates";
import type { GameState } from "./state";

function validate(state: GameState, amount: number): Result {
  if (!state.tiles.dungeon) return fail("Der Kerker ist noch verschlossen.");
  if (!Number.isSafeInteger(amount) || amount < 1) return fail(`Ungültige Menge: ${amount}`);
  if (state.dungeon.prisoners < amount) return fail("Nicht genug Gefangene.");
  return OK;
}

/** Verhör: verbraucht Gefangene, bringt Hinweise für Story und neue Ziele. */
export function interrogate(state: GameState, amount: number): Result {
  const check = validate(state, amount);
  if (!check.ok) return check;
  state.dungeon.prisoners -= amount;
  state.dungeon.interrogated += amount;
  state.dungeon.intel += amount * intelPerInterrogation(state);
  return OK;
}

/** Fron: Gefangene werden dauerhaft zu Arbeitern und erhöhen die Produktion. */
export function forceLabor(state: GameState, amount: number): Result {
  const check = validate(state, amount);
  if (!check.ok) return check;
  state.dungeon.prisoners -= amount;
  state.dungeon.laborers += amount;
  return OK;
}
