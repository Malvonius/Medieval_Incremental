import { Decimal } from "../core/decimal";
import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { RESEARCH, type ResearchId } from "../content/balance";
import { type GameState, spend } from "./state";

type View = DeepReadonly<GameState>;

export type ResearchStatus = "done" | "active" | "locked" | "busy" | "poor" | "ready";

/** Status einer Forschung für UI und Bot. Reihenfolge der Prüfungen = Priorität der Anzeige. */
export function researchStatus(state: View, id: ResearchId): ResearchStatus {
  const def = RESEARCH[id];
  const { alchemy } = state;
  if (alchemy.completed[id]) return "done";
  if (alchemy.active?.id === id) return "active";
  if (!state.tiles.alchemy || !def.requires.every((req) => alchemy.completed[req])) return "locked";
  if (alchemy.active !== null) return "busy";
  if (state.resources.gold.lt(def.gold) || state.resources.souls.lt(def.souls)) return "poor";
  return "ready";
}

const STATUS_TEXT: Readonly<Record<Exclude<ResearchStatus, "ready">, string>> = {
  done: "Bereits erforscht.",
  active: "Wird bereits erforscht.",
  locked: "Die Grundlagen fehlen noch.",
  busy: "Der Turm arbeitet bereits an etwas anderem.",
  poor: "Nicht genug Gold oder Seelen.",
};

export function startResearch(state: GameState, id: ResearchId): Result {
  const status = researchStatus(state, id);
  if (status !== "ready") return fail(STATUS_TEXT[status]);
  const def = RESEARCH[id];
  spend(state, "gold", new Decimal(def.gold));
  spend(state, "souls", new Decimal(def.souls));
  state.alchemy.active = { id, remaining: def.durationSeconds };
  return OK;
}

/** Gibt true zurück, wenn eine Forschung abgeschlossen wurde (Raten ändern sich). */
export function tickAlchemy(state: GameState, dt: number): boolean {
  const active = state.alchemy.active;
  if (active === null) return false;
  active.remaining -= dt;
  if (active.remaining > 0) return false;
  state.alchemy.completed[active.id] = true;
  state.alchemy.active = null;
  return true;
}

export const completedResearchCount = (state: View): number =>
  Object.values(state.alchemy.completed).filter(Boolean).length;
