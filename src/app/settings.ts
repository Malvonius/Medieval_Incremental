import { writable } from "svelte/store";
import { CHARGES, type Charge, DIVISIONS, type Division, SCHEME_IDS, type SchemeId, TINCTURES } from "../content/extensions";

/** Frei belegbare Tastaturbefehle (1–9 und 0 wählen immer Kacheln). */
export const COMMAND_IDS = ["collect", "save", "prevTile", "nextTile"] as const;
export type CommandId = (typeof COMMAND_IDS)[number];
export type KeyBindings = Readonly<Record<CommandId, string>>;
export const DEFAULT_KEYS: KeyBindings = { collect: " ", save: "s", prevTile: "q", nextTile: "e" };

export interface Heraldry {
  /** Indizes in TINCTURES. */
  readonly field: number;
  readonly second: number;
  readonly charge: Charge;
  readonly chargeColor: number;
  readonly division: Division;
}
export const DEFAULT_HERALDRY: Heraldry = { field: 0, second: 5, charge: "tower", chargeColor: 6, division: "pale" };

export type Notation = "suffix" | "scientific";

export interface Settings {
  readonly notation: Notation;
  readonly autosaveSeconds: 15 | 30 | 60;
  readonly reduceMotion: boolean;
  readonly sound: boolean;
  readonly volume: number;
  readonly notifications: boolean;
  readonly music: boolean;
  /** Kacheln, deren Tutorial-Hinweis schon gesehen wurde. */
  readonly hintsSeen: readonly string[];
  /** Story-Szenen vorlesen (Web Speech API). */
  readonly voice: boolean;
  readonly scheme: SchemeId;
  readonly heraldry: Heraldry;
  readonly keys: KeyBindings;
}

const KEY = "vhal.settings";
export const DEFAULT_SETTINGS: Settings = { notation: "suffix", autosaveSeconds: 30, reduceMotion: false, sound: false, volume: 0.5, notifications: false, music: true, hintsSeen: [], voice: false, scheme: "ember", heraldry: DEFAULT_HERALDRY, keys: DEFAULT_KEYS };

const isTincture = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < TINCTURES.length;

function parseHeraldry(v: unknown): Heraldry {
  if (typeof v !== "object" || v === null) return DEFAULT_HERALDRY;
  const h = v as Record<string, unknown>;
  return {
    field: isTincture(h["field"]) ? h["field"] : DEFAULT_HERALDRY.field,
    second: isTincture(h["second"]) ? h["second"] : DEFAULT_HERALDRY.second,
    chargeColor: isTincture(h["chargeColor"]) ? h["chargeColor"] : DEFAULT_HERALDRY.chargeColor,
    charge: (CHARGES as readonly unknown[]).includes(h["charge"]) ? (h["charge"] as Charge) : DEFAULT_HERALDRY.charge,
    division: (DIVISIONS as readonly unknown[]).includes(h["division"]) ? (h["division"] as Division) : DEFAULT_HERALDRY.division,
  };
}

/** Jede Belegung muss ein einzelnes, eindeutiges Zeichen bzw. ein Tastenname sein. */
function parseKeys(v: unknown): KeyBindings {
  if (typeof v !== "object" || v === null) return DEFAULT_KEYS;
  const k = v as Record<string, unknown>;
  const out = { ...DEFAULT_KEYS };
  for (const id of COMMAND_IDS) {
    const key = k[id];
    if (typeof key === "string" && key.length > 0 && key.length <= 12 && !/^[0-9]$/.test(key)) out[id] = key;
  }
  return new Set(Object.values(out)).size === COMMAND_IDS.length ? out : DEFAULT_KEYS;
}

/** Validiert gespeicherte Einstellungen feldweise; Ungültiges fällt auf den Standard zurück. */
export function parseSettings(raw: string | null): Settings {
  if (raw === null) return DEFAULT_SETTINGS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (typeof data !== "object" || data === null) return DEFAULT_SETTINGS;
  const d = data as Record<string, unknown>;
  const pick = <T>(value: unknown, ok: (v: unknown) => v is T, fallback: T): T => (ok(value) ? value : fallback);
  return {
    notation: pick(d["notation"], (v): v is Notation => v === "suffix" || v === "scientific", DEFAULT_SETTINGS.notation),
    autosaveSeconds: pick(d["autosaveSeconds"], (v): v is 15 | 30 | 60 => v === 15 || v === 30 || v === 60, DEFAULT_SETTINGS.autosaveSeconds),
    reduceMotion: pick(d["reduceMotion"], (v): v is boolean => typeof v === "boolean", DEFAULT_SETTINGS.reduceMotion),
    sound: pick(d["sound"], (v): v is boolean => typeof v === "boolean", DEFAULT_SETTINGS.sound),
    volume: pick(d["volume"], (v): v is number => typeof v === "number" && v >= 0 && v <= 1, DEFAULT_SETTINGS.volume),
    notifications: pick(d["notifications"], (v): v is boolean => typeof v === "boolean", DEFAULT_SETTINGS.notifications),
    music: pick(d["music"], (v): v is boolean => typeof v === "boolean", DEFAULT_SETTINGS.music),
    hintsSeen: pick(
      d["hintsSeen"],
      (v): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string"),
      DEFAULT_SETTINGS.hintsSeen,
    ),
    voice: pick(d["voice"], (v): v is boolean => typeof v === "boolean", DEFAULT_SETTINGS.voice),
    scheme: pick(d["scheme"], (v): v is SchemeId => (SCHEME_IDS as readonly unknown[]).includes(v), DEFAULT_SETTINGS.scheme),
    heraldry: parseHeraldry(d["heraldry"]),
    keys: parseKeys(d["keys"]),
  };
}

function readStored(): string | null {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  } catch {
    return null; // Storage gesperrt (privater Modus) – Standardwerte genügen.
  }
}

export const settings = writable<Settings>(parseSettings(readStored()));

settings.subscribe((value) => {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(value));
  } catch {
    // Nicht speicherbar: Einstellungen gelten dann nur für diese Sitzung.
  }
});

export const updateSettings = (patch: Partial<Settings>): void => settings.update((s) => ({ ...s, ...patch }));
