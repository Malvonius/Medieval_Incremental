import { Decimal } from "../core/decimal";
import { nextRandom } from "../core/random";
import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { BUILDING_IDS, type BuildingId } from "../content/balance";
import { RETAINER_MAX_LEVEL, type RetainerId } from "../content/extensions";
import {
  HAGGLE_DISCOUNT,
  HAGGLE_FIRM,
  HAGGLE_WIN,
  LOYALTY_MAX,
  LOYALTY_QUEST,
  MERCHANT_INTERVAL,
  MERCHANT_MIN_PRICE,
  MERCHANT_OFFERS,
  MERCHANT_STAY,
  OFFERS,
  OFFER_KINDS,
  type OfferKind,
  PLAN_AFFINITIES,
  PLAN_COLUMNS,
  PLAN_NEIGHBOUR_BONUS,
  PLAN_SIZE,
  QUESTS,
  RAVEN_GIFT_GOLD_SECONDS,
  RAVEN_GIFT_MIN,
  RAVEN_GIFT_SECONDS,
  SEASONS,
  SEASON_IDS,
  SEASON_SECONDS,
  type SeasonId,
} from "../content/living";
import type { Rates } from "./rates";
import { type GameState, type MerchantOffer, gain, spend } from "./state";

type View = DeepReadonly<GameState>;

function random(state: GameState): number {
  const [value, next] = nextRandom(state.rng);
  state.rng = next;
  return value;
}

// ── Jahreszeiten ─────────────────────────────────────────────────────────────

/** Jahreszeit aus der Spielzeit – deterministisch, ohne eigenen Zustand. */
export const seasonOf = (playSeconds: number): SeasonId =>
  SEASON_IDS[Math.floor(playSeconds / SEASON_SECONDS) % SEASON_IDS.length] ?? "spring";

/** Fortschritt innerhalb der Jahreszeit (0–1), für weiche Übergänge in der Grafik. */
export const seasonProgress = (playSeconds: number): number => (playSeconds % SEASON_SECONDS) / SEASON_SECONDS;

export function seasonFactor(state: View, resource: string): number {
  let factor = 1;
  for (const e of SEASONS[seasonOf(state.stats.playSeconds)].effects) if (e.kind === "resourceMult" && e.resource === resource) factor *= e.factor;
  return factor;
}

// ── Der Rabe ─────────────────────────────────────────────────────────────────

export function tickRaven(state: GameState, dt: number): void {
  if (state.raven.gift || !state.tiles.keep) return;
  state.raven.timer -= dt;
  if (state.raven.timer <= 0) state.raven.gift = true;
}

export const ravenGift = (rates: Rates): Decimal => Decimal.max(rates.gold.mul(RAVEN_GIFT_GOLD_SECONDS), RAVEN_GIFT_MIN);

/** Anstupsen: liefert das Geschenk ab, falls eines da ist; sonst nur ein Kommentar. */
export function pokeRaven(state: GameState, rates: Rates): Result {
  if (!state.tiles.keep) return fail("Der Rabe sitzt noch nicht auf dem Burgfried.");
  state.raven.pokes += 1;
  if (state.raven.gift) {
    gain(state, "gold", ravenGift(rates));
    state.raven.gift = false;
    state.raven.timer = RAVEN_GIFT_SECONDS;
  }
  return OK;
}

// ── Der wandernde Händler ────────────────────────────────────────────────────

const offerUnlocked = (state: View, kind: OfferKind): boolean => {
  switch (kind) {
    case "iron":
    case "swords":
      return state.tiles.forge;
    case "soldiers":
      return state.tiles.warroom;
    case "faith":
      return state.tiles.chapel;
    case "souls":
      return state.tiles.crypt;
    case "fortune":
      return true;
  }
};

function makeOffer(state: GameState, kind: OfferKind, rates: Rates): MerchantOffer {
  const def = OFFERS[kind];
  const amount = def.resource === null || def.seconds === 0 ? new Decimal(def.min) : Decimal.max(rates[def.resource].mul(def.seconds), def.min);
  // Preis schwankt um ±30 % um den Listenwert.
  const price = Decimal.max(rates.gold.mul(def.priceSeconds * (0.7 + random(state) * 0.6)), MERCHANT_MIN_PRICE).floor();
  return { kind, price, amount: amount.floor(), mood: "new" };
}

/** Ankunft und Abreise. Gibt true zurück, wenn sich das Angebot änderte. */
export function tickMerchant(state: GameState, dt: number, rates: Rates): boolean {
  if (!state.tiles.keep) return false;
  const m = state.merchant;
  m.timer -= dt;
  if (m.timer > 0) return false;
  if (m.present) {
    m.present = false;
    m.offers = [];
    m.timer = MERCHANT_INTERVAL;
    return true;
  }
  const pool = OFFER_KINDS.filter((k) => offerUnlocked(state, k));
  const offers: MerchantOffer[] = [];
  while (offers.length < MERCHANT_OFFERS && pool.length > 0) {
    const [kind] = pool.splice(Math.floor(random(state) * pool.length), 1);
    if (kind) offers.push(makeOffer(state, kind, rates));
  }
  m.present = true;
  m.offers = offers;
  m.timer = MERCHANT_STAY;
  return true;
}

function openOffer(state: GameState, index: number): MerchantOffer | string {
  if (!state.merchant.present) return "Der Händler ist weitergezogen.";
  const offer = state.merchant.offers[index];
  if (!offer) return "Dieses Angebot gibt es nicht.";
  if (offer.mood === "sold") return "Das ist bereits verkauft.";
  if (offer.mood === "offended") return "Der Händler spricht nicht mehr mit dir.";
  return offer;
}

export function buyOffer(state: GameState, index: number): Result {
  const offer = openOffer(state, index);
  if (typeof offer === "string") return fail(offer);
  if (state.resources.gold.lt(offer.price)) return fail("Nicht genug Gold.");
  spend(state, "gold", offer.price);
  const def = OFFERS[offer.kind];
  if (offer.kind === "soldiers") state.warroom.soldiers += offer.amount.toNumber();
  else if (offer.kind === "fortune") state.events.buff = { resource: "gold", factor: 2, remaining: def.seconds };
  else if (def.resource) gain(state, def.resource, offer.amount);
  offer.mood = "sold";
  return OK;
}

/** Feilschen ist ein Glücksspiel: Rabatt, Sturheit oder Beleidigung. Nur einmal je Angebot. */
export function haggle(state: GameState, index: number): Result {
  const offer = openOffer(state, index);
  if (typeof offer === "string") return fail(offer);
  if (offer.mood !== "new") return fail("Über diesen Preis wurde schon gefeilscht.");
  const roll = random(state);
  if (roll < HAGGLE_WIN) {
    offer.price = offer.price.mul(HAGGLE_DISCOUNT).floor();
    offer.mood = "deal";
  } else if (roll < HAGGLE_FIRM) {
    offer.mood = "firm";
  } else {
    offer.mood = "offended";
  }
  return OK;
}

// ── Burgplan ─────────────────────────────────────────────────────────────────

const AFFINITY = new Map<BuildingId, ReadonlySet<BuildingId>>(
  BUILDING_IDS.map((id) => [id, new Set(PLAN_AFFINITIES.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : [])))]),
);

export const planNeighbours = (index: number): number[] => {
  const x = index % PLAN_COLUMNS;
  const out: number[] = [];
  if (x > 0) out.push(index - 1);
  if (x < PLAN_COLUMNS - 1) out.push(index + 1);
  if (index - PLAN_COLUMNS >= 0) out.push(index - PLAN_COLUMNS);
  if (index + PLAN_COLUMNS < PLAN_SIZE) out.push(index + PLAN_COLUMNS);
  return out;
};

export const goodNeighbours = (a: BuildingId, b: BuildingId): boolean => AFFINITY.get(a)?.has(b) ?? false;

/** Bonus eines Gebäudes aus passenden Nachbarn im Burgplan (1 = keiner). */
export function planFactor(state: View, building: BuildingId): number {
  const index = state.plan.indexOf(building);
  if (index < 0) return 1;
  let matches = 0;
  for (const n of planNeighbours(index)) {
    const other = state.plan[n];
    if (other && goodNeighbours(building, other)) matches += 1;
  }
  return 1 + matches * PLAN_NEIGHBOUR_BONUS;
}

/** Setzt ein Viertel auf ein Feld (verschiebt es, falls schon platziert) oder räumt das Feld (null). */
export function placeDistrict(state: GameState, index: number, building: BuildingId | null): Result {
  if (!Number.isSafeInteger(index) || index < 0 || index >= PLAN_SIZE) return fail("Dieses Feld liegt außerhalb des Burgplans.");
  if (building !== null) {
    if (!BUILDING_IDS.includes(building)) return fail("Unbekanntes Gebäude.");
    if (state.buildings[building] < 1) return fail("Erst muss mindestens ein solches Gebäude stehen.");
    const previous = state.plan.indexOf(building);
    if (previous >= 0) state.plan[previous] = null;
  }
  state.plan[index] = building;
  return OK;
}

// ── Aufträge der Gefolgsleute ────────────────────────────────────────────────

export const currentQuest = (state: View, id: RetainerId) => {
  const r = state.retinue[id];
  return r ? QUESTS[id][r.quest] : undefined;
};

export function startQuest(state: GameState, id: RetainerId): Result {
  const r = state.retinue[id];
  if (!r) return fail("Diese Person steht nicht in deinen Diensten.");
  if (r.questRemaining !== null) return fail("Dieser Auftrag läuft bereits.");
  const step = QUESTS[id][r.quest];
  if (!step) return fail("Alle Aufträge dieser Person sind erfüllt.");
  const cost = new Decimal(step.cost.amount);
  if (state.resources[step.cost.resource].lt(cost)) return fail("Dafür fehlen dir noch die Mittel.");
  spend(state, step.cost.resource, cost);
  r.questRemaining = step.seconds;
  return OK;
}

export interface QuestDone {
  readonly retainer: RetainerId;
  readonly step: number;
}

/** Lässt laufende Aufträge ablaufen; gibt die erfüllten zurück (Stufe +1, Treue +30). */
export function tickQuests(state: GameState, dt: number): QuestDone[] {
  const done: QuestDone[] = [];
  for (const id of Object.keys(state.retinue) as RetainerId[]) {
    const r = state.retinue[id];
    if (!r || r.questRemaining === null) continue;
    r.questRemaining -= dt;
    if (r.questRemaining > 0) continue;
    r.questRemaining = null;
    done.push({ retainer: id, step: r.quest });
    r.quest += 1;
    r.level = Math.min(RETAINER_MAX_LEVEL, r.level + 1);
    r.loyalty = Math.min(LOYALTY_MAX, r.loyalty + LOYALTY_QUEST);
  }
  return done;
}
