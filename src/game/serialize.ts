import { Decimal, isFiniteDecimal } from "../core/decimal";
import { SaveError } from "../core/save";
import type { DeepReadonly } from "../core/types";
import {
  ENDING_IDS,
  EXPEDITION_IDS,
  WAVES,
  type ExpeditionId,
  RECIPE_IDS,
  RESEARCH_IDS,
  type RecipeId,
  type ResearchId,
} from "../content/balance";
import { type ActiveExpedition, type AlchemyState, type GameState, type SiegeState, createInitialState } from "./state";

/** JSON-taugliche Form des Spielstands (Decimal → String). */
export type PlainState = ReturnType<typeof toPlain>;

const mapDecimals = <K extends string>(record: { readonly [P in K]: Decimal }): Record<K, string> => {
  const out = {} as Record<K, string>;
  for (const key of Object.keys(record) as K[]) out[key] = record[key].toString();
  return out;
};

export function toPlain(state: DeepReadonly<GameState>) {
  return {
    resources: mapDecimals(state.resources),
    totals: mapDecimals(state.totals),
    runTotals: mapDecimals(state.runTotals),
    buildings: { ...state.buildings },
    upgrades: { ...state.upgrades },
    tiles: { ...state.tiles },
    flags: { ...state.flags },
    forge: { queue: [...state.forge.queue], progress: state.forge.progress },
    warroom: {
      soldiers: state.warroom.soldiers,
      active: state.warroom.active.map((e) => ({ ...e })),
      completed: { ...state.warroom.completed },
      fallen: state.warroom.fallen,
      seals: state.warroom.seals,
    },
    dungeon: { ...state.dungeon },
    alchemy: {
      active: state.alchemy.active === null ? null : { ...state.alchemy.active },
      completed: { ...state.alchemy.completed },
    },
    chapel: { vows: { ...state.chapel.vows } },
    ritual: { ...state.ritual },
    siege: {
      wave: state.siege.wave,
      battle: state.siege.battle === null ? null : { ...state.siege.battle },
      fortifications: { ...state.siege.fortifications },
      ending: state.siege.ending,
    },
    story: { completed: [...state.story.completed], completedAt: state.story.completed.map((_, i) => state.story.completedAt[i] ?? 0) },
    achievements: { ...state.achievements },
    stats: { ...state.stats },
    lastSeen: state.lastSeen,
  };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function section(root: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = root[key];
  if (value === undefined) return {};
  if (!isObject(value)) throw new SaveError(`Feld "${key}" muss ein Objekt sein.`);
  return value;
}

function readNumber(value: unknown, path: string, fallback: number, opts: { integer?: boolean } = {}): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new SaveError(`Feld "${path}" muss eine nicht-negative Zahl sein.`);
  }
  if (opts.integer && !Number.isSafeInteger(value)) throw new SaveError(`Feld "${path}" muss ganzzahlig sein.`);
  return value;
}

function readBoolean(value: unknown, path: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new SaveError(`Feld "${path}" muss true/false sein.`);
  return value;
}

function readDecimal(value: unknown, path: string, fallback: Decimal): Decimal {
  if (value === undefined) return fallback;
  if (typeof value !== "string") throw new SaveError(`Feld "${path}" muss eine Zahl als Text sein.`);
  let parsed: Decimal;
  try {
    parsed = new Decimal(value);
  } catch (cause) {
    throw new SaveError(`Feld "${path}" ist keine gültige Zahl.`, { cause });
  }
  if (!isFiniteDecimal(parsed) || parsed.lt(0)) throw new SaveError(`Feld "${path}" ist keine gültige Zahl.`);
  return parsed;
}

/** Liest alle bekannten Schlüssel; unbekannte werden verworfen, fehlende erhalten Standardwerte. */
function readRecord<K extends string, V>(
  source: Record<string, unknown>,
  defaults: Record<K, V>,
  path: string,
  read: (value: unknown, path: string, fallback: V) => V,
): Record<K, V> {
  const out = {} as Record<K, V>;
  for (const key of Object.keys(defaults) as K[]) out[key] = read(source[key], `${path}.${key}`, defaults[key]);
  return out;
}

const RECIPE_SET: ReadonlySet<string> = new Set(RECIPE_IDS);
const EXPEDITION_SET: ReadonlySet<string> = new Set(EXPEDITION_IDS);
const RESEARCH_SET: ReadonlySet<string> = new Set(RESEARCH_IDS);

/** Entfernt Duplikate; fehlende Zeitstempel (ältere Spielstände) werden mit 0 ergänzt. */
function readStory(completed: readonly string[], rawAt: unknown): GameState["story"] {
  const at = Array.isArray(rawAt) ? rawAt : [];
  const seen = new Set<string>();
  const out: GameState["story"] = { completed: [], completedAt: [] };
  completed.forEach((id, i) => {
    if (seen.has(id)) return;
    seen.add(id);
    const t: unknown = at[i];
    out.completed.push(id);
    out.completedAt.push(typeof t === "number" && Number.isFinite(t) && t >= 0 ? t : 0);
  });
  return out;
}

const ENDING_SET: ReadonlySet<string> = new Set(ENDING_IDS);

function readSiege(source: Record<string, unknown>, defaults: SiegeState): SiegeState {
  const wave = readNumber(source["wave"], "siege.wave", 0, { integer: true });
  if (wave > WAVES.length) throw new SaveError('Feld "siege.wave" ist zu groß.');
  const rawBattle = source["battle"];
  let battle: SiegeState["battle"] = null;
  if (rawBattle !== undefined && rawBattle !== null) {
    if (!isObject(rawBattle)) throw new SaveError('Feld "siege.battle" muss ein Objekt sein.');
    battle = { remaining: readNumber(rawBattle["remaining"], "siege.battle.remaining", 0) };
  }
  const rawEnding = source["ending"];
  if (rawEnding !== undefined && rawEnding !== null && (typeof rawEnding !== "string" || !ENDING_SET.has(rawEnding))) {
    throw new SaveError('Feld "siege.ending" ist kein gültiges Ende.');
  }
  return {
    wave,
    battle,
    fortifications: readRecord(section(source, "fortifications"), defaults.fortifications, "siege.fortifications", (v, p, f) =>
      readNumber(v, p, f, { integer: true }),
    ),
    ending: (rawEnding ?? null) as SiegeState["ending"],
  };
}

function readActiveResearch(value: unknown): AlchemyState["active"] {
  if (value === undefined || value === null) return null;
  if (!isObject(value)) throw new SaveError('Feld "alchemy.active" muss ein Objekt sein.');
  const id = value["id"];
  if (typeof id !== "string" || !RESEARCH_SET.has(id)) throw new SaveError('Feld "alchemy.active.id" ist keine gültige Forschung.');
  return { id: id as ResearchId, remaining: readNumber(value["remaining"], "alchemy.active.remaining", 0) };
}

function readActiveExpeditions(value: unknown): ActiveExpedition[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new SaveError('Feld "warroom.active" muss eine Liste sein.');
  const seen = new Set<string>();
  return value.map((entry, i) => {
    const path = `warroom.active[${i}]`;
    if (!isObject(entry)) throw new SaveError(`Feld "${path}" muss ein Objekt sein.`);
    const id = entry["id"];
    if (typeof id !== "string" || !EXPEDITION_SET.has(id) || seen.has(id)) {
      throw new SaveError(`Feld "${path}.id" ist keine gültige Expedition.`);
    }
    seen.add(id);
    return {
      id: id as ExpeditionId,
      remaining: readNumber(entry["remaining"], `${path}.remaining`, 0),
      soldiers: readNumber(entry["soldiers"], `${path}.soldiers`, 0, { integer: true }),
    };
  });
}

export function fromPlain(data: unknown, now: number): GameState {
  if (!isObject(data)) throw new SaveError("Spielstand-Inhalt muss ein Objekt sein.");
  const d = createInitialState(now);

  const forge = section(data, "forge");
  const rawQueue = forge["queue"] ?? [];
  if (!Array.isArray(rawQueue) || !rawQueue.every((r): r is RecipeId => typeof r === "string" && RECIPE_SET.has(r))) {
    throw new SaveError('Feld "forge.queue" enthält unbekannte Rezepte.');
  }

  const story = section(data, "story");
  const rawCompleted = story["completed"] ?? [];
  if (!Array.isArray(rawCompleted) || !rawCompleted.every((id): id is string => typeof id === "string")) {
    throw new SaveError('Feld "story.completed" muss eine Liste von Texten sein.');
  }

  const stats = section(data, "stats");
  const warroom = section(data, "warroom");
  const dungeon = section(data, "dungeon");
  const alchemy = section(data, "alchemy");
  const chapel = section(data, "chapel");
  const totals = readRecord(section(data, "totals"), d.totals, "totals", readDecimal);
  const readCount = (v: unknown, p: string, f: number): number => readNumber(v, p, f, { integer: true });

  return {
    resources: readRecord(section(data, "resources"), d.resources, "resources", readDecimal),
    totals,
    // Spielstände vor dem ersten Ritual kennen keinen Lauf: dann ist der Lauf das ganze Spiel.
    runTotals: readRecord(section(data, "runTotals"), totals, "runTotals", readDecimal),
    buildings: readRecord(section(data, "buildings"), d.buildings, "buildings", readCount),
    upgrades: readRecord(section(data, "upgrades"), d.upgrades, "upgrades", readBoolean),
    tiles: readRecord(section(data, "tiles"), d.tiles, "tiles", readBoolean),
    flags: readRecord(section(data, "flags"), d.flags, "flags", readBoolean),
    forge: { queue: [...rawQueue], progress: readNumber(forge["progress"], "forge.progress", 0) },
    warroom: {
      soldiers: readCount(warroom["soldiers"], "warroom.soldiers", 0),
      active: readActiveExpeditions(warroom["active"]),
      completed: readRecord(section(warroom, "completed"), d.warroom.completed, "warroom.completed", readCount),
      fallen: readCount(warroom["fallen"], "warroom.fallen", 0),
      seals: readCount(warroom["seals"], "warroom.seals", 0),
    },
    dungeon: readRecord(dungeon, d.dungeon, "dungeon", readCount),
    alchemy: {
      active: readActiveResearch(alchemy["active"]),
      completed: readRecord(section(alchemy, "completed"), d.alchemy.completed, "alchemy.completed", readBoolean),
    },
    chapel: { vows: readRecord(section(chapel, "vows"), d.chapel.vows, "chapel.vows", readBoolean) },
    ritual: readRecord(section(data, "ritual"), d.ritual, "ritual", readCount),
    siege: readSiege(section(data, "siege"), d.siege),
    story: readStory(rawCompleted, story["completedAt"]),
    achievements: readRecord(section(data, "achievements"), d.achievements, "achievements", readBoolean),
    stats: {
      playSeconds: readNumber(stats["playSeconds"], "stats.playSeconds", 0),
      clicks: readCount(stats["clicks"], "stats.clicks", 0),
    },
    lastSeen: readNumber(data["lastSeen"], "lastSeen", now),
  };
}
