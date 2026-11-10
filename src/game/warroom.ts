import { Decimal } from "../core/decimal";
import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { maxAffordable } from "../core/economy";
import { EXPEDITIONS, type ExpeditionId, RECRUIT_COST, RECRUIT_SWORDS } from "../content/balance";
import { expeditionDuration, expeditionLosses, expeditionSlots, recruitCost } from "./rates";
import { type GameState, aliveSoldiers, gain, spend } from "./state";

type View = DeepReadonly<GameState>;

/** Größte rekrutierbare Anzahl: begrenzt durch Gold (geometrisch) und Schwerter (linear). */
export function maxRecruitable(state: View): number {
  const byGold = maxAffordable(RECRUIT_COST, aliveSoldiers(state), state.resources.gold);
  const bySwords = Math.floor(state.resources.swords.div(RECRUIT_SWORDS).toNumber());
  return Math.max(0, Math.min(byGold, bySwords));
}

export function recruit(state: GameState, amount: number): Result {
  if (!state.tiles.warroom) return fail("Der Kriegsrat ist noch nicht einberufen.");
  if (!Number.isSafeInteger(amount) || amount < 1) return fail(`Ungültige Menge: ${amount}`);
  const swords = new Decimal(RECRUIT_SWORDS * amount);
  if (state.resources.swords.lt(swords)) return fail("Nicht genug Schwerter in der Waffenkammer.");
  const cost = recruitCost(state, amount);
  if (state.resources.gold.lt(cost)) return fail("Nicht genug Gold für den Sold.");
  spend(state, "gold", cost);
  spend(state, "swords", swords);
  state.warroom.soldiers += amount;
  return OK;
}

export type LaunchBlocker = "locked" | "done" | "running" | "slots" | "soldiers";

/** Grund, warum eine Expedition nicht starten kann – oder null. Für UI und Bot gleichermaßen. */
export function launchBlocker(state: View, id: ExpeditionId): LaunchBlocker | null {
  const def = EXPEDITIONS[id];
  if (!state.tiles.warroom || (def.requiresFlag !== null && !state.flags[def.requiresFlag])) return "locked";
  if (!def.repeatable && state.warroom.completed[id] > 0) return "done";
  if (state.warroom.active.some((e) => e.id === id)) return "running";
  if (state.warroom.active.length >= expeditionSlots(state)) return "slots";
  if (state.warroom.soldiers < def.soldiers) return "soldiers";
  return null;
}

export const LAUNCH_BLOCKER_TEXT: Readonly<Record<LaunchBlocker, string>> = {
  locked: "Dieses Ziel ist noch unbekannt.",
  done: "Dieses Ziel ist bereits gefallen.",
  running: "Dieser Trupp ist bereits unterwegs.",
  slots: "Alle Hauptleute sind bereits im Feld.",
  soldiers: "Nicht genug Soldaten.",
};

export function launchExpedition(state: GameState, id: ExpeditionId): Result {
  const blocker = launchBlocker(state, id);
  if (blocker !== null) return fail(LAUNCH_BLOCKER_TEXT[blocker]);
  const sent = EXPEDITIONS[id].soldiers;
  state.warroom.soldiers -= sent;
  state.warroom.active.push({ id, remaining: expeditionDuration(state, id), soldiers: sent });
  return OK;
}

/** Beute wird bei Rückkehr berechnet, Gold relativ zur dann aktuellen Produktion. */
function completeExpedition(state: GameState, id: ExpeditionId, sent: number, goldRate: Decimal): void {
  const { reward } = EXPEDITIONS[id];
  const lost = expeditionLosses(state, id, sent);
  state.warroom.soldiers += sent - lost;
  state.warroom.fallen += lost;
  state.warroom.completed[id] += 1;
  state.warroom.seals += reward.seals;
  state.dungeon.prisoners += reward.prisoners;
  gain(state, "gold", goldRate.mul(reward.goldSeconds));
  gain(state, "iron", new Decimal(reward.iron));
}

/** Gibt true zurück, wenn mindestens eine Expedition heimkehrte (Raten ändern sich). */
export function tickWarroom(state: GameState, dt: number, goldRate: Decimal): boolean {
  const active = state.warroom.active;
  if (active.length === 0) return false;
  let returned = false;
  for (const expedition of active) expedition.remaining -= dt;
  for (let i = active.length - 1; i >= 0; i -= 1) {
    const expedition = active[i];
    if (expedition === undefined || expedition.remaining > 0) continue;
    active.splice(i, 1);
    completeExpedition(state, expedition.id, expedition.soldiers, goldRate);
    returned = true;
  }
  return returned;
}
