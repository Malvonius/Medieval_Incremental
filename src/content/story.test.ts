import { describe, expect, it } from "vitest";
import { StoryDirector } from "../game/story";
import { STORY } from "./story";

describe("Story-Graph", () => {
  it("hat eindeutige IDs und nur bekannte Vorgänger", () => {
    expect(() => new StoryDirector(STORY)).not.toThrow();
  });

  it("ist zyklenfrei und jeder Knoten ist erreichbar", () => {
    const byId = new Map(STORY.map((n) => [n.id, n]));
    const state = new Map<string, "visiting" | "done">();
    const visit = (id: string): void => {
      if (state.get(id) === "done") return;
      if (state.get(id) === "visiting") throw new Error(`Zyklus bei ${id}`);
      state.set(id, "visiting");
      for (const req of byId.get(id)?.requires ?? []) visit(req);
      state.set(id, "done");
    };
    for (const node of STORY) visit(node.id);
    expect(STORY.filter((n) => n.requires.length === 0).length).toBeGreaterThan(0);
  });

  it.each([
    ["act1Complete", 1],
    ["act2Complete", 1],
    ["act3Complete", 1],
    ["act4Complete", 1],
    ["act5Complete", 2],
  ] as const)("%s wird von genau %i Knoten gesetzt", (flag, count) => {
    const enders = STORY.filter((n) => n.effects.some((e) => e.kind === "setFlag" && e.flag === flag));
    expect(enders).toHaveLength(count);
  });

  it("schaltet jede Kachel höchstens einmal frei", () => {
    const tiles = STORY.flatMap((n) => n.effects.flatMap((e) => (e.kind === "unlockTile" ? [e.tile] : [])));
    expect(new Set(tiles).size).toBe(tiles.length);
  });
});
