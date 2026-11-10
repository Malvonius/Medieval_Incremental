import { describe, expect, it } from "vitest";
import { get } from "svelte/store";
import { GameController } from "./controller";
import { exportSave } from "../game/persistence";
import { createInitialState } from "../game/state";

const memory = () => {
  const map = new Map<string, string>();
  return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
};

describe("Speicherplatz wechseln", () => {
  it("sichert den alten Platz, lädt den neuen und merkt sich die Wahl", () => {
    const storage = memory();
    const game = new GameController(storage, () => 0);
    const state = createInitialState(0);
    state.tiles.keep = true;
    expect(game.importText(exportSave(state)).ok).toBe(true);
    expect(game.dispatch({ type: "collect" }).ok).toBe(true);
    game.switchSlot(2);
    expect(get(game.slot)).toBe(2);
    expect(storage.map.get("vhal.slot")).toBe("2");
    expect(get(game.snapshot).state.stats.clicks).toBe(0);
    game.switchSlot(1);
    expect(get(game.snapshot).state.stats.clicks).toBe(1);
    expect(new GameController(storage, () => 0).slotSummaries().map((s) => s.kind)).toEqual(["loaded", "loaded", "empty"]);
  });
});
