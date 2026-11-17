import { writable } from "svelte/store";

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
}

const KEY = "vhal.settings";
export const DEFAULT_SETTINGS: Settings = { notation: "suffix", autosaveSeconds: 30, reduceMotion: false, sound: false, volume: 0.5, notifications: false, music: true, hintsSeen: [] };

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
