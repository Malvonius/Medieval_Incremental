import { SaveError, decodeSave, encodeSave } from "../core/save";
import type { DeepReadonly } from "../core/types";
import { MIGRATIONS } from "./migrations";
import { fromPlain, toPlain } from "./serialize";
import { type GameState, SAVE_VERSION } from "./state";

export const SAVE_KEY = "vhal.save";
export const SLOT_COUNT = 3;
export const SLOT_KEY = "vhal.slot";
export type SlotNumber = 1 | 2 | 3;

/** Platz 1 nutzt den bisherigen Schlüssel – bestehende Spielstände bleiben ohne Umzug erhalten. */
export const slotKey = (slot: SlotNumber): string => (slot === 1 ? SAVE_KEY : `${SAVE_KEY}.${slot}`);
export const SLOT_KEYS: readonly string[] = [1, 2, 3].map((n) => slotKey(n as SlotNumber));

export const isSlot = (value: unknown): value is SlotNumber => value === 1 || value === 2 || value === 3;
export const CORRUPT_BACKUP_KEY = "vhal.save.corrupt";

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const exportSave = (state: DeepReadonly<GameState>): string => encodeSave(toPlain(state), SAVE_VERSION);

export const importSave = (text: string, now: number): GameState =>
  fromPlain(decodeSave(text, SAVE_VERSION, MIGRATIONS), now);

export function writeSave(storage: KeyValueStorage, state: DeepReadonly<GameState>, slot: SlotNumber = 1): void {
  storage.setItem(slotKey(slot), exportSave(state));
}

export type LoadResult =
  | { readonly kind: "empty" }
  | { readonly kind: "loaded"; readonly state: GameState }
  | { readonly kind: "corrupt"; readonly error: SaveError };

/**
 * Ein beschädigter Spielstand wird nie still überschrieben: Er wird gesichert
 * und der Fehler an die UI gemeldet.
 */
export function readSave(storage: KeyValueStorage, now: number, slot: SlotNumber = 1): LoadResult {
  const raw = storage.getItem(slotKey(slot));
  if (raw === null) return { kind: "empty" };
  try {
    return { kind: "loaded", state: importSave(raw, now) };
  } catch (error) {
    if (!(error instanceof SaveError)) throw error;
    storage.setItem(slot === 1 ? CORRUPT_BACKUP_KEY : `${CORRUPT_BACKUP_KEY}.${slot}`, raw);
    return { kind: "corrupt", error };
  }
}

export interface SlotSummary {
  readonly slot: SlotNumber;
  readonly kind: LoadResult["kind"];
  readonly playSeconds: number;
  readonly act: number;
  readonly ngPlus: number;
}

/** Kurzinfo je Speicherplatz für die Auswahl – liest, verändert nichts. */
export function summarizeSlot(storage: KeyValueStorage, slot: SlotNumber, now: number): SlotSummary {
  const result = readSave(storage, now, slot);
  if (result.kind !== "loaded") return { slot, kind: result.kind, playSeconds: 0, act: 0, ngPlus: 0 };
  const { flags, stats, meta } = result.state;
  const act = 1 + [flags.act1Complete, flags.act2Complete, flags.act3Complete, flags.act4Complete].filter(Boolean).length;
  return { slot, kind: "loaded", playSeconds: stats.playSeconds, act, ngPlus: meta.ngPlus };
}
