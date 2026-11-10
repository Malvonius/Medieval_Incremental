import { describe, expect, it } from "vitest";
import { runBot } from "./bot";

/**
 * Pacing-Wächter. Soll für Menschen: Akt I ≈ 60 min, Akt II endet ≈ 150 min.
 * Der Bot spielt rund 28 % schneller, daher die Fenster unten (Toleranz ca. ±20 %).
 */
const result = runBot({ maxSeconds: 4 * 3600, stopAtNode: "a2_komturei" });
const at = (id: string): number => {
  const milestone = result.milestones.find((m) => m.id === id);
  if (!milestone) throw new Error(`Knoten ${id} nicht erreicht`);
  return milestone.seconds;
};

describe("Pacing", () => {
  it("Bot schließt Akt I im Zielfenster ab", () => {
    expect(at("a1_grey_banner")).toBeGreaterThanOrEqual(32 * 60);
    expect(at("a1_grey_banner")).toBeLessThanOrEqual(54 * 60);
  });

  it("Bot schließt Akt II im Zielfenster ab", () => {
    expect(result.reachedStop).toBe(true);
    expect(at("a2_komturei")).toBeGreaterThanOrEqual(88 * 60);
    expect(at("a2_komturei")).toBeLessThanOrEqual(128 * 60);
  });

  it("erreicht alle Knoten genau einmal und in Akt-Reihenfolge", () => {
    const ids = result.milestones.map((m) => m.id);
    expect(ids[0]).toBe("a1_inheritance");
    expect(ids.at(-1)).toBe("a2_komturei");
    expect(new Set(ids).size).toBe(ids.length);
    const acts = result.milestones.map((m) => m.act);
    expect(acts).toEqual([...acts].sort((a, b) => a - b));
  });
});
