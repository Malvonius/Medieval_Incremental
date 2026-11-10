import { describe, expect, it } from "vitest";
import { runBot } from "./bot";

/**
 * Pacing-Wächter. Soll für Menschen: Akt I ≈ 60 min, Akt II endet ≈ 150 min, Akt III ≈ 270 min, Akt IV ≈ 390 min, Spielende ≈ 480 min.
 * Der Bot spielt rund 28 % schneller, daher die Fenster unten (Toleranz ca. ±20 %).
 */
const ENDINGS = ["a5_end_light", "a5_end_ash"] as const;
const result = runBot({ maxSeconds: 10 * 3600, stopAtNode: ENDINGS });
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
    expect(at("a2_komturei")).toBeGreaterThanOrEqual(88 * 60);
    expect(at("a2_komturei")).toBeLessThanOrEqual(128 * 60);
  });

  it("Bot schließt Akt III im Zielfenster ab", () => {
    expect(at("a3_stone")).toBeGreaterThanOrEqual(158 * 60);
    expect(at("a3_stone")).toBeLessThanOrEqual(232 * 60);
  });

  it("Bot schließt Akt IV im Zielfenster ab", () => {
    expect(at("a4_rebirth")).toBeGreaterThanOrEqual(228 * 60);
    expect(at("a4_rebirth")).toBeLessThanOrEqual(336 * 60);
  });

  it("Bot erreicht ein Ende im Zielfenster (≈ 8 h für Menschen)", () => {
    expect(result.reachedStop).toBe(true);
    const end = result.milestones.find((m) => (ENDINGS as readonly string[]).includes(m.id));
    expect(end).toBeDefined();
    expect(end?.seconds).toBeGreaterThanOrEqual(292 * 60);
    expect(end?.seconds).toBeLessThanOrEqual(400 * 60);
  });

  it("erreicht alle Knoten genau einmal und in Akt-Reihenfolge", () => {
    const ids = result.milestones.map((m) => m.id);
    expect(ids[0]).toBe("a1_inheritance");
    expect(ids.some((id) => (ENDINGS as readonly string[]).includes(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    const acts = result.milestones.map((m) => m.act);
    expect(acts).toEqual([...acts].sort((a, b) => a - b));
  });
});
