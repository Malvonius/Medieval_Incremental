import { nextRandom } from "../core/random";
import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { BUILDINGS, BUILDING_IDS, type BuildingId } from "../content/balance";
import {
  type ChallengeId,
  DECISIONS,
  type DecisionId,
  EVENTS,
  EVENT_CHANCE,
  EVENT_IDS,
  EVENT_ROLL_SECONDS,
  type EventEffect,
  type EventId,
} from "../content/depth";
import { type Rates, buildingCost, isBuildingVisible, unitRate } from "./rates";
import { type GameState, createInitialState, gain, spend } from "./state";

type View = DeepReadonly<GameState>;

function random(state: GameState): number {
  const [value, next] = nextRandom(state.rng);
  state.rng = next;
  return value;
}

// ── Zufallsereignisse ─────────────────────────────────────────────────────────

/** Gibt true zurück, wenn sich ein Multiplikator änderte (Buff endete). */
export function tickEvents(state: GameState, dt: number): boolean {
  const ev = state.events;
  let changed = false;
  if (ev.buff !== null) {
    ev.buff.remaining -= dt;
    if (ev.buff.remaining <= 0) {
      ev.buff = null;
      changed = true;
    }
  }
  if (ev.pending !== null) return changed;
  ev.timer -= dt;
  while (ev.timer <= 0 && ev.pending === null) {
    ev.timer += EVENT_ROLL_SECONDS;
    if (random(state) >= EVENT_CHANCE) continue;
    const eligible: EventId[] = EVENT_IDS.filter((id) => EVENTS[id].condition(state));
    if (eligible.length > 0) ev.pending = eligible[Math.floor(random(state) * eligible.length)] ?? null;
  }
  return changed;
}

function applyEventEffect(state: GameState, effect: EventEffect, rates: Rates): void {
  switch (effect.kind) {
    case "gainSeconds":
      gain(state, effect.resource, rates[effect.resource].mul(effect.seconds));
      return;
    case "loseFraction":
      spend(state, effect.resource, state.resources[effect.resource].mul(effect.fraction));
      return;
    case "prisoners":
      state.dungeon.prisoners += effect.amount;
      return;
    case "loseSoldiers": {
      const lost = Math.floor(state.warroom.soldiers * effect.fraction);
      state.warroom.soldiers -= lost;
      state.warroom.fallen += lost;
      return;
    }
    case "buff":
      state.events.buff = { resource: effect.resource, factor: effect.factor, remaining: effect.seconds };
      return;
  }
}

export function resolveEvent(state: GameState, choice: number, rates: Rates): Result {
  const id = state.events.pending;
  if (id === null) return fail("Es gibt kein offenes Ereignis.");
  const option = EVENTS[id].choices[choice];
  if (option === undefined) return fail(`Unbekannte Wahl: ${choice}`);
  for (const effect of option.effects) applyEventEffect(state, effect, rates);
  state.events.pending = null;
  return OK;
}

// ── Verwalter ─────────────────────────────────────────────────────────────────

const GOLD_BUILDINGS: readonly BuildingId[] = BUILDING_IDS.filter(
  (id) => BUILDINGS[id].produces === "gold" && BUILDINGS[id].costResource === "gold",
);

/** Bezahlbares Gold-Gebäude mit der kürzesten Amortisation (Kosten / Ertrag) – dieselbe Regel wie der Bot. */
export function bestPaybackBuilding(state: View): BuildingId | null {
  let best: { id: BuildingId; payback: number } | null = null;
  for (const id of GOLD_BUILDINGS) {
    if (!isBuildingVisible(state, id)) continue;
    const cost = buildingCost(state, id, 1);
    if (cost.gt(state.resources.gold)) continue;
    const payback = cost.div(unitRate(state, id)).toNumber();
    if (best === null || payback < best.payback) best = { id, payback };
  }
  return best?.id ?? null;
}

const STEWARD_INTERVAL = 1;
const STEWARD_MAX_PER_INTERVAL = 25;

export const stewardActive = (state: View): boolean => state.upgrades.steward && state.automation.enabled;

/** Kauft einmal pro Sekunde bis zu 25 Gebäude. Gibt true zurück, wenn gekauft wurde. */
export function tickAutomation(state: GameState, dt: number): boolean {
  if (!stewardActive(state)) return false;
  state.automation.timer += dt;
  if (state.automation.timer < STEWARD_INTERVAL) return false;
  state.automation.timer = 0;
  let bought = false;
  for (let i = 0; i < STEWARD_MAX_PER_INTERVAL; i += 1) {
    const id = bestPaybackBuilding(state);
    if (id === null) break;
    spend(state, "gold", buildingCost(state, id, 1));
    state.buildings[id] += 1;
    bought = true;
  }
  return bought;
}

export function setAutomation(state: GameState, enabled: boolean): Result {
  if (!state.upgrades.steward) return fail("Du hast noch keinen Verwalter.");
  state.automation.enabled = enabled;
  return OK;
}

// ── Entscheidungen ────────────────────────────────────────────────────────────

export function decisionOpen(state: View, id: DecisionId): boolean {
  const def = DECISIONS[id];
  return state.story.completed.includes(def.afterNode) && !def.options.some((o) => state.flags[o.flag]);
}

export function decide(state: GameState, id: DecisionId, option: 0 | 1): Result {
  if (!decisionOpen(state, id)) return fail("Diese Entscheidung steht nicht an.");
  state.flags[DECISIONS[id].options[option].flag] = true;
  return OK;
}

// ── Neues Spiel+ ──────────────────────────────────────────────────────────────

/**
 * Nach einem Ende: alles zurück auf Anfang, außer Erinnerungen, Erfolgen und
 * abgeschlossenen Herausforderungen. Optional mit einer neuen Herausforderung.
 */
export function newGamePlus(state: GameState, challenge: ChallengeId | null): Result {
  if (!state.flags.act5Complete) return fail("Erst muss die letzte Glocke geläutet haben.");
  const meta = { ...state.meta, challengesDone: { ...state.meta.challengesDone } };
  if (meta.challenge !== null) meta.challengesDone[meta.challenge] = true;
  meta.ngPlus += 1;
  meta.memories += 1;
  meta.challenge = challenge;
  const fresh = createInitialState(state.lastSeen);
  Object.assign(state, fresh, { meta, achievements: { ...state.achievements }, rng: state.rng });
  return OK;
}
