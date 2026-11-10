import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { ENDINGS, type EndingId, type FortificationId, WAVES, type WaveDef } from "../content/balance";
import { defense, fortificationCost } from "./rates";
import { type GameState, spend } from "./state";
import { Decimal } from "../core/decimal";

type View = DeepReadonly<GameState>;

/** Die Belagerung beginnt mit dem Ende von Akt IV und endet mit dem Sieg über den Bischof. */
export const siegeActive = (state: View): boolean => state.flags.act4Complete && state.siege.wave < WAVES.length;

export const nextWave = (state: View): WaveDef | undefined => WAVES[state.siege.wave];

export function buildFortification(state: GameState, id: FortificationId, amount: number): Result {
  if (!state.flags.act4Complete) return fail("Noch droht Vhal keine Belagerung.");
  if (!Number.isSafeInteger(amount) || amount < 1) return fail(`Ungültige Menge: ${amount}`);
  const cost = fortificationCost(state, id, amount);
  if (state.resources.gold.lt(cost)) return fail("Nicht genug Gold.");
  spend(state, "gold", cost);
  state.siege.fortifications[id] += amount;
  return OK;
}

export type BattleBlocker = "inactive" | "fighting" | "weak";

export function battleBlocker(state: View): BattleBlocker | null {
  const wave = nextWave(state);
  if (!siegeActive(state) || wave === undefined) return "inactive";
  if (state.siege.battle !== null) return "fighting";
  if (defense(state) < wave.strength) return "weak";
  return null;
}

export const BATTLE_BLOCKER_TEXT: Readonly<Record<BattleBlocker, string>> = {
  inactive: "Vor den Mauern ist es still.",
  fighting: "Die Schlacht tobt bereits.",
  weak: "Die Wehrkraft reicht nicht aus.",
};

export function startBattle(state: GameState): Result {
  const blocker = battleBlocker(state);
  if (blocker !== null) return fail(BATTLE_BLOCKER_TEXT[blocker]);
  const wave = nextWave(state);
  if (wave === undefined) return fail(BATTLE_BLOCKER_TEXT.inactive);
  state.siege.battle = { remaining: wave.durationSeconds };
  return OK;
}

/** Gibt true zurück, wenn eine Schlacht endete (Soldaten fielen, Raten ändern sich). */
export function tickSiege(state: GameState, dt: number): boolean {
  const battle = state.siege.battle;
  const wave = nextWave(state);
  if (battle === null || wave === undefined) return false;
  battle.remaining -= dt;
  if (battle.remaining > 0) return false;
  const lost = Math.floor(state.warroom.soldiers * wave.lossRate);
  state.warroom.soldiers -= lost;
  state.warroom.fallen += lost;
  state.siege.wave += 1;
  state.siege.battle = null;
  return true;
}

export type EndingBlocker = "notYet" | "chosen" | "cost";

export function endingBlocker(state: View, id: EndingId): EndingBlocker | null {
  if (state.siege.wave < WAVES.length) return "notYet";
  if (state.siege.ending !== null) return "chosen";
  const def = ENDINGS[id];
  if (state.resources[def.costResource].lt(def.cost)) return "cost";
  return null;
}

export const ENDING_BLOCKER_TEXT: Readonly<Record<EndingBlocker, string>> = {
  notYet: "Der Bischof steht noch vor den Toren.",
  chosen: "Du hast deine Wahl bereits getroffen.",
  cost: "Dafür fehlt dir noch die Kraft.",
};

export function chooseEnding(state: GameState, id: EndingId): Result {
  const blocker = endingBlocker(state, id);
  if (blocker !== null) return fail(ENDING_BLOCKER_TEXT[blocker]);
  const def = ENDINGS[id];
  spend(state, def.costResource, new Decimal(def.cost));
  state.siege.ending = id;
  return OK;
}
