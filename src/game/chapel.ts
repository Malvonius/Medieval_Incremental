import { Decimal } from "../core/decimal";
import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { VOWS, VOW_IDS, type VowId } from "../content/balance";
import { vowSlots } from "./rates";
import { type GameState, spend } from "./state";

type View = DeepReadonly<GameState>;

export const swornVows = (state: View): number => VOW_IDS.filter((id) => state.chapel.vows[id]).length;

export type VowBlocker = "locked" | "sworn" | "slots" | "faith";

export function vowBlocker(state: View, id: VowId): VowBlocker | null {
  if (!state.tiles.chapel) return "locked";
  if (state.chapel.vows[id]) return "sworn";
  if (swornVows(state) >= vowSlots(state)) return "slots";
  if (state.resources.faith.lt(VOWS[id].faithCost)) return "faith";
  return null;
}

export const VOW_BLOCKER_TEXT: Readonly<Record<VowBlocker, string>> = {
  locked: "Die Kapelle gehört noch dem Bischof.",
  sworn: "Dieses Gelübde hast du bereits abgelegt.",
  slots: "Alle Altäre sind belegt. Brich zuerst ein anderes Gelübde.",
  faith: "Nicht genug Glauben.",
};

/** Ein Gelübde kostet Glauben. Es bleibt auch über das Ritual der Asche bestehen. */
export function swearVow(state: GameState, id: VowId): Result {
  const blocker = vowBlocker(state, id);
  if (blocker !== null) return fail(VOW_BLOCKER_TEXT[blocker]);
  spend(state, "faith", new Decimal(VOWS[id].faithCost));
  state.chapel.vows[id] = true;
  return OK;
}

/** Ein Gelübde zu brechen ist kostenlos – der gezahlte Glaube ist verloren. */
export function breakVow(state: GameState, id: VowId): Result {
  if (!state.chapel.vows[id]) return fail("Dieses Gelübde hast du nicht abgelegt.");
  state.chapel.vows[id] = false;
  return OK;
}
