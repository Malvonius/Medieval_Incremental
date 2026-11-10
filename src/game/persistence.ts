import { SaveError, decodeSave, encodeSave } from "../core/save";
import type { DeepReadonly } from "../core/types";
import { MIGRATIONS } from "./migrations";
import { fromPlain, toPlain } from "./serialize";
import { type GameState, SAVE_VERSION } from "./state";

export const SAVE_KEY = "vhal.save";
export const CORRUPT_BACKUP_KEY = "vhal.save.corrupt";

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const exportSave = (state: DeepReadonly<GameState>): string => encodeSave(toPlain(state), SAVE_VERSION);

export const importSave = (text: string, now: number): GameState =>
  fromPlain(decodeSave(text, SAVE_VERSION, MIGRATIONS), now);

export function writeSave(storage: KeyValueStorage, state: DeepReadonly<GameState>): void {
  storage.setItem(SAVE_KEY, exportSave(state));
}

export type LoadResult =
  | { readonly kind: "empty" }
  | { readonly kind: "loaded"; readonly state: GameState }
  | { readonly kind: "corrupt"; readonly error: SaveError };

/**
 * Ein beschädigter Spielstand wird nie still überschrieben: Er wird gesichert
 * und der Fehler an die UI gemeldet.
 */
export function readSave(storage: KeyValueStorage, now: number): LoadResult {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return { kind: "empty" };
  try {
    return { kind: "loaded", state: importSave(raw, now) };
  } catch (error) {
    if (!(error instanceof SaveError)) throw error;
    storage.setItem(CORRUPT_BACKUP_KEY, raw);
    return { kind: "corrupt", error };
  }
}
