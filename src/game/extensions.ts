import { Decimal } from "../core/decimal";
import { bulkCost } from "../core/economy";
import { type DeepReadonly, type Result, OK, fail } from "../core/types";
import { BUILDINGS, BUILDING_IDS, type BuildingId, RECIPE_IDS, RECRUIT_SWORDS, UPGRADES, UPGRADE_IDS, WAVES, type EndingId } from "../content/balance";
import {
  AUTOMATION_INTERVAL,
  AUTOMATION_MAX_BUYS,
  AUTOMATORS,
  type AutomatorId,
  CODEX_IDS,
  type CodexId,
  CONCORD_REPUTATION,
  COURT_GAIN,
  COURT_GROWTH,
  COURT_RIVAL_LOSS,
  DECISION_REPUTATION,
  FACTIONS,
  FACTION_IDS,
  type FactionId,
  MAP,
  MAP_BASE_STRENGTH,
  MAP_CENTER,
  MAP_LOSS_RATE,
  MAP_SIZE,
  MAP_STRENGTH_GROWTH,
  OFFICE_IDS,
  type OfficeId,
  REPUTATION_BOON,
  REPUTATION_MAX,
  RETAINERS,
  RETAINER_EQUIP_SWORDS,
  RETAINER_IDS,
  RETAINER_LEVEL_GROWTH,
  RETAINER_MAX_LEVEL,
  type RetainerId,
  STATIONS,
  STATION_COST_GROWTH,
  STATION_IDS,
  type StationId,
  SWORDS_PER_BLADE,
  TALENTS,
  type TalentId,
} from "../content/extensions";
import { enqueueCraft, canAffordRecipe } from "./forge";
import { buildingCost, forgeCapacity, isBuildingVisible, isUpgradeVisible, recruitCost } from "./rates";
import { recruit } from "./warroom";
import { newGamePlus } from "./depth";
import { adjustReputation } from "./bonuses";

export { adjustReputation };
import { type GameState, type RunKind, RUN_LOG_CAP, gain, spend } from "./state";

type View = DeepReadonly<GameState>;

// ── Laufprotokoll ─────────────────────────────────────────────────────────────

/** Schließt den aktuellen Lauf ab: Dauer seit runStart ins Protokoll (Ringpuffer-Semantik). */
export function logRun(state: GameState, kind: RunKind): void {
  const log = state.meta.runLog;
  log.push({ kind, seconds: Math.max(0, state.stats.playSeconds - state.stats.runStart) });
  if (log.length > RUN_LOG_CAP) log.splice(0, log.length - RUN_LOG_CAP);
  state.stats.runStart = state.stats.playSeconds;
}

// ── Automatisierung ───────────────────────────────────────────────────────────

export const automatorUnlocked = (state: View, id: AutomatorId): boolean =>
  state.meta.talents.hands || state.ritual.performed >= AUTOMATORS[id].rituals;

export function setAutomator(state: GameState, id: AutomatorId, enabled: boolean): Result {
  if (!automatorUnlocked(state, id)) return fail("Dieser Automat ist noch nicht freigeschaltet.");
  state.autobuy.enabled[id] = enabled;
  return OK;
}

/** Einzelnes Gebäude zum automatischen Kauf aus- oder abwählen; sichtbar muss es sein. */
export function setBuildingAuto(state: GameState, id: BuildingId, enabled: boolean): Result {
  if (enabled && !isBuildingVisible(state, id)) return fail("Dieses Gebäude ist noch nicht verfügbar.");
  state.autobuy.picks[id] = enabled;
  return OK;
}

export function setAutoThreshold(state: GameState, threshold: number): Result {
  if (!(threshold > 0 && threshold <= 1)) return fail("Die Schwelle muss zwischen 1 und 100 % liegen.");
  state.autobuy.threshold = threshold;
  return OK;
}

const withinThreshold = (state: View, cost: Decimal, stock: Decimal): boolean => cost.lte(stock.mul(state.autobuy.threshold));
const active = (state: View, id: AutomatorId): boolean => state.autobuy.enabled[id] && automatorUnlocked(state, id);

function autoUpgrades(state: GameState): boolean {
  let bought = false;
  for (const id of UPGRADE_IDS) {
    const def = UPGRADES[id];
    if (!isUpgradeVisible(state, id)) continue;
    const cost = new Decimal(def.cost);
    if (!withinThreshold(state, cost, state.resources[def.costResource])) continue;
    spend(state, def.costResource, cost);
    state.upgrades[id] = true;
    bought = true;
  }
  return bought;
}

/**
 * Kauft je Durchlauf das relativ günstigste Gebäude, bis nichts mehr unter die Schwelle fällt.
 * `all` = Aschenbaumeister aktiv (alle Gebäude), sonst nur die einzeln ausgewählten.
 */
function autoBuildings(state: GameState, all: boolean): boolean {
  let bought = false;
  for (let i = 0; i < AUTOMATION_MAX_BUYS; i += 1) {
    let best: { id: BuildingId; share: number; cost: Decimal } | null = null;
    for (const id of BUILDING_IDS) {
      if (!(all || state.autobuy.picks[id]) || !isBuildingVisible(state, id)) continue;
      const stock = state.resources[BUILDINGS[id].costResource];
      const cost = buildingCost(state, id, 1);
      if (!withinThreshold(state, cost, stock)) continue;
      const share = cost.div(stock).toNumber();
      if (best === null || share < best.share) best = { id, share, cost };
    }
    if (best === null) break;
    spend(state, BUILDINGS[best.id].costResource, best.cost);
    state.buildings[best.id] += 1;
    bought = true;
  }
  return bought;
}

function autoForge(state: GameState): boolean {
  let queued = false;
  for (const recipe of RECIPE_IDS) {
    while (state.forge.queue.length < forgeCapacity(state) && canAffordRecipe(state, recipe, 1)) {
      if (!enqueueCraft(state, recipe, 1).ok) break;
      queued = true;
    }
  }
  return queued;
}

function autoRecruit(state: GameState): boolean {
  let recruited = false;
  for (let i = 0; i < AUTOMATION_MAX_BUYS; i += 1) {
    if (state.resources.swords.lt(RECRUIT_SWORDS) || !withinThreshold(state, recruitCost(state, 1), state.resources.gold)) break;
    if (!recruit(state, 1).ok) break;
    recruited = true;
  }
  return recruited;
}

/** Einmal pro Sekunde; gibt true zurück, wenn etwas gekauft wurde (Raten ändern sich). */
export function tickAutobuy(state: GameState, dt: number): boolean {
  state.autobuy.timer += dt;
  if (state.autobuy.timer < AUTOMATION_INTERVAL) return false;
  state.autobuy.timer = 0;
  let changed = false;
  if (active(state, "upgrades")) changed = autoUpgrades(state) || changed;
  const all = active(state, "buildings");
  if (all || BUILDING_IDS.some((id) => state.autobuy.picks[id])) changed = autoBuildings(state, all) || changed;
  if (active(state, "forge") && state.tiles.forge) changed = autoForge(state) || changed;
  if (active(state, "recruit") && state.tiles.warroom) changed = autoRecruit(state) || changed;
  return changed;
}

// ── Aufstieg & Talente ────────────────────────────────────────────────────────

/** Glut eines Aufstiegs: 1 + Erinnerungen + 2·log10(1 + Asche). */
export const emberGain = (state: View): number =>
  1 + state.meta.memories + Math.floor(2 * Math.log10(1 + state.ritual.ash));

export const canAscend = (state: View): boolean => state.flags.act5Complete;

/**
 * Wie Neues Spiel+, aber Erinnerungen werden zu Glut. Talente, Enden, Kodex,
 * Erfolge und Herausforderungen bleiben.
 */
export function ascend(state: GameState): Result {
  if (!canAscend(state)) return fail("Aufsteigen kann nur, wer ein Ende erreicht hat.");
  const embers = emberGain(state);
  logRun(state, "ascend");
  const result = newGamePlus(state, null);
  if (!result.ok) return result;
  state.meta.memories = 0;
  state.meta.embers += embers;
  state.meta.ascensions += 1;
  return OK;
}

export type TalentBlocker = "owned" | "requires" | "embers";

export function talentBlocker(state: View, id: TalentId): TalentBlocker | null {
  const def = TALENTS[id];
  if (state.meta.talents[id]) return "owned";
  if (!def.requires.every((r) => state.meta.talents[r])) return "requires";
  if (state.meta.embers < def.cost) return "embers";
  return null;
}

export function buyTalent(state: GameState, id: TalentId): Result {
  const blocker = talentBlocker(state, id);
  if (blocker === "owned") return fail("Dieses Talent glüht bereits.");
  if (blocker === "requires") return fail("Erst müssen die vorigen Talente glühen.");
  if (blocker === "embers") return fail("Nicht genug Glut.");
  state.meta.embers -= TALENTS[id].cost;
  state.meta.talents[id] = true;
  return OK;
}

// ── Fraktionen ────────────────────────────────────────────────────────────────

export const courtCost = (state: View, id: FactionId): Decimal =>
  bulkCost({ base: FACTIONS[id].courtCost, growth: COURT_GROWTH }, state.factions.courted[id], 1);

export function court(state: GameState, id: FactionId): Result {
  if (!state.tiles.hall) return fail("Der Rittersaal ist noch nicht eröffnet.");
  if (state.factions.rep[id] >= REPUTATION_MAX) return fail("Mehr Gunst gibt es nicht.");
  const cost = courtCost(state, id);
  if (state.resources.gold.lt(cost)) return fail("Nicht genug Gold.");
  spend(state, "gold", cost);
  state.factions.courted[id] += 1;
  adjustReputation(state, { [id]: COURT_GAIN, [FACTIONS[id].rival]: -COURT_RIVAL_LOSS });
  return OK;
}

/** Wendet die Rufänderung einer Entscheidung an (Flag der gewählten Option). */
export function applyDecisionReputation(state: GameState, flag: string): void {
  const deltas = DECISION_REPUTATION[flag];
  if (deltas) adjustReputation(state, deltas);
}

export const factionsInConcord = (state: View): boolean => FACTION_IDS.every((id) => state.factions.rep[id] >= CONCORD_REPUTATION);

// ── Gefolge ───────────────────────────────────────────────────────────────────

export const levelCost = (state: View, id: RetainerId): Decimal =>
  bulkCost({ base: RETAINERS[id].hireCost, growth: RETAINER_LEVEL_GROWTH }, state.retinue[id]?.level ?? 0, 1);

export function hire(state: GameState, id: RetainerId): Result {
  if (!state.tiles.hall) return fail("Der Rittersaal ist noch nicht eröffnet.");
  if (state.retinue[id] !== null) return fail("Diese Person steht schon in deinen Diensten.");
  const cost = new Decimal(RETAINERS[id].hireCost);
  if (state.resources.gold.lt(cost)) return fail("Nicht genug Gold.");
  spend(state, "gold", cost);
  state.retinue[id] = { level: 1, office: null, equipped: false };
  return OK;
}

export function levelUp(state: GameState, id: RetainerId): Result {
  const r = state.retinue[id];
  if (r === null) return fail("Diese Person steht nicht in deinen Diensten.");
  if (r.level >= RETAINER_MAX_LEVEL) return fail("Mehr kann man von niemandem verlangen.");
  const cost = levelCost(state, id);
  if (state.resources.gold.lt(cost)) return fail("Nicht genug Gold.");
  spend(state, "gold", cost);
  r.level += 1;
  return OK;
}

export function equip(state: GameState, id: RetainerId): Result {
  const r = state.retinue[id];
  if (r === null) return fail("Diese Person steht nicht in deinen Diensten.");
  if (r.equipped) return fail("Diese Person ist bereits ausgerüstet.");
  const swords = new Decimal(RETAINER_EQUIP_SWORDS);
  if (state.resources.swords.lt(swords)) return fail("Nicht genug Schwerter in der Waffenkammer.");
  spend(state, "swords", swords);
  r.equipped = true;
  return OK;
}

/** Ein Amt hat höchstens einen Inhaber; der bisherige wird abberufen. */
export function assign(state: GameState, id: RetainerId, office: OfficeId | null): Result {
  const r = state.retinue[id];
  if (r === null) return fail("Diese Person steht nicht in deinen Diensten.");
  if (office !== null && !OFFICE_IDS.includes(office)) return fail("Unbekanntes Amt.");
  if (office !== null) {
    for (const other of RETAINER_IDS) {
      const o = state.retinue[other];
      if (o !== null && other !== id && o.office === office) o.office = null;
    }
  }
  r.office = office;
  return OK;
}

// ── Ländereien ────────────────────────────────────────────────────────────────

const neighbours = (index: number): number[] => {
  const x = index % MAP_SIZE;
  const y = Math.floor(index / MAP_SIZE);
  const out: number[] = [];
  if (x > 0) out.push(index - 1);
  if (x < MAP_SIZE - 1) out.push(index + 1);
  if (y > 0) out.push(index - MAP_SIZE);
  if (y < MAP_SIZE - 1) out.push(index + MAP_SIZE);
  return out;
};

const chebyshev = (index: number): number =>
  Math.max(Math.abs((index % MAP_SIZE) - (MAP_CENTER % MAP_SIZE)), Math.abs(Math.floor(index / MAP_SIZE) - Math.floor(MAP_CENTER / MAP_SIZE)));

/** Benötigte Soldaten: wächst mit der Entfernung und der Zahl bereits eroberter Felder. */
export const conquestStrength = (state: View, index: number): number =>
  Math.ceil(MAP_BASE_STRENGTH * MAP_STRENGTH_GROWTH ** (chebyshev(index) + state.map.owned.length - 1));

export const isBorder = (state: View, index: number): boolean =>
  !state.map.owned.includes(index) && neighbours(index).some((n) => state.map.owned.includes(n));

export function conquer(state: GameState, index: number): Result {
  if (!state.tiles.warroom) return fail("Der Kriegsrat ist noch nicht einberufen.");
  if (!Number.isSafeInteger(index) || index < 0 || index >= MAP.length) return fail("Dieses Feld liegt außerhalb der Karte.");
  if (!isBorder(state, index)) return fail("Nur angrenzende Felder lassen sich erobern.");
  const need = conquestStrength(state, index);
  if (state.warroom.soldiers < need) return fail("Zu wenige Soldaten für diesen Feldzug.");
  const lost = Math.floor(need * MAP_LOSS_RATE);
  state.warroom.soldiers -= lost;
  state.warroom.fallen += lost;
  state.map.owned.push(index);
  return OK;
}

// ── Werkstatt-Kette ───────────────────────────────────────────────────────────

export const stationCost = (state: View, id: StationId): Decimal =>
  bulkCost({ base: STATIONS[id].baseCost, growth: STATION_COST_GROWTH }, state.workshop.levels[id], 1);

export function upgradeStation(state: GameState, id: StationId): Result {
  if (!state.tiles.forge) return fail("Die Schmiede ist noch nicht zugänglich.");
  const cost = stationCost(state, id);
  if (state.resources.iron.lt(cost)) return fail("Nicht genug Eisen.");
  spend(state, "iron", cost);
  state.workshop.levels[id] += 1;
  return OK;
}

/** Durchsatz je Station (Ausgabe/s), begrenzt durch die Eingabe der Vorstufe. */
export interface ChainFlow {
  readonly capacity: Readonly<Record<StationId, number>>;
  readonly actual: Readonly<Record<StationId, number>>;
  /** Station, die die Kette bremst – oder null, wenn nichts läuft. */
  readonly bottleneck: StationId | null;
}

export function chainFlow(state: View): ChainFlow {
  const capacity = { mine: 0, smelter: 0, smithy: 0 } as Record<StationId, number>;
  for (const id of STATION_IDS) capacity[id] = state.workshop.levels[id] * STATIONS[id].perLevel;
  const ore = capacity.mine;
  const ingots = Math.min(capacity.smelter, ore / STATIONS.smelter.ratio);
  const blades = Math.min(capacity.smithy, ingots / STATIONS.smithy.ratio);
  const actual = { mine: ore, smelter: ingots, smithy: blades };
  let bottleneck: StationId | null = null;
  if (blades > 0 || capacity.smithy > 0 || capacity.smelter > 0 || capacity.mine > 0) {
    // Die Engstelle ist die Station mit der kleinsten Kapazität, gemessen in Klingen pro Sekunde.
    const inBlades: Record<StationId, number> = {
      mine: capacity.mine / (STATIONS.smelter.ratio * STATIONS.smithy.ratio),
      smelter: capacity.smelter / STATIONS.smithy.ratio,
      smithy: capacity.smithy,
    };
    bottleneck = STATION_IDS.reduce((a, b) => (inBlades[b] < inBlades[a] ? b : a));
  }
  return { capacity, actual, bottleneck };
}

/**
 * Stationen arbeiten mit Lagern zwischen den Stufen: Erz → Barren → Klingen → Schwerter.
 * Gibt true zurück, wenn Schwerter entstanden (Goldbonus ändert sich).
 */
export function tickWorkshop(state: GameState, dt: number): boolean {
  const w = state.workshop;
  const { levels } = w;
  if (levels.mine === 0) return false;
  w.ore += levels.mine * STATIONS.mine.perLevel * dt;
  const smelted = Math.min(levels.smelter * STATIONS.smelter.perLevel * dt, w.ore / STATIONS.smelter.ratio);
  w.ore -= smelted * STATIONS.smelter.ratio;
  w.ingots += smelted;
  const forged = Math.min(levels.smithy * STATIONS.smithy.perLevel * dt, w.ingots / STATIONS.smithy.ratio);
  w.ingots -= forged * STATIONS.smithy.ratio;
  w.blades += forged;
  const whole = Math.floor(w.blades);
  if (whole < 1) return false;
  w.blades -= whole;
  gain(state, "swords", new Decimal(whole * SWORDS_PER_BLADE));
  return true;
}

// ── Enden ─────────────────────────────────────────────────────────────────────

/** Geheime Enden: Eintracht (alle Fraktionen hoch), Erwachen (alle anderen Enden gesehen). */
export function endingUnlocked(state: View, id: EndingId): boolean {
  if (id === "concord") return factionsInConcord(state);
  if (id === "awakening") return state.meta.endingsSeen.light && state.meta.endingsSeen.ash && state.meta.endingsSeen.concord;
  return true;
}

// ── Kodex & Freischaltungen ───────────────────────────────────────────────────

const CODEX_TRIGGERS: Readonly<Record<CodexId, (s: View) => boolean>> = {
  vhal: (s) => s.tiles.keep,
  brannoc: (s) => s.tiles.forge,
  greyorder: (s) => s.tiles.warroom,
  dungeon: (s) => s.tiles.dungeon,
  crypt: (s) => s.tiles.crypt,
  ilse: (s) => s.tiles.alchemy,
  bell: (s) => s.tiles.chapel,
  ash: (s) => s.ritual.performed > 0,
  bishop: (s) => s.siege.wave >= WAVES.length,
  events: (s) => s.stats.eventsResolved > 0,
  retinue: (s) => RETAINER_IDS.some((id) => s.retinue[id] !== null),
  lands: (s) => s.map.owned.length >= 3,
  factions: (s) => FACTION_IDS.some((id) => s.factions.rep[id] >= REPUTATION_BOON),
  ember: (s) => s.meta.ascensions > 0,
  concord: (s) => s.meta.endingsSeen.concord,
  awakening: (s) => s.meta.endingsSeen.awakening,
};

/** Schaltet neue Kodex-Einträge frei (bleiben über alle Neustarts) und gibt sie zurück. */
export function evaluateCodex(state: GameState): CodexId[] {
  const unlocked: CodexId[] = [];
  for (const id of CODEX_IDS) {
    if (!state.meta.codex[id] && CODEX_TRIGGERS[id](state)) {
      state.meta.codex[id] = true;
      unlocked.push(id);
    }
  }
  return unlocked;
}

/** Erweiterungen ohne eigenen Story-Knoten: der Rittersaal öffnet nach Akt I. */
export function unlockExtras(state: GameState): boolean {
  if (!state.tiles.hall && state.flags.act1Complete) {
    state.tiles.hall = true;
    return true;
  }
  return false;
}
