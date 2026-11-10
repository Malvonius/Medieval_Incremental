import { describe, expect, it } from "vitest";
import { runBot } from "./bot";

/**
 * Pacing-Wächter: Ein menschlicher Spieler soll Akt I in etwa 60 min schaffen.
 * Der Bot spielt rund 28 % schneller, Soll für ihn also ≈ 43 min (Toleranz ±25 %).
 */
describe("Pacing", () => {
  it("Bot schließt Akt I im Zielfenster ab", () => {
    const result = runBot({ maxSeconds: 3 * 3600, stopAtNode: "a1_grey_banner" });
    expect(result.reachedStop).toBe(true);
    expect(result.seconds).toBeGreaterThanOrEqual(32 * 60);
    expect(result.seconds).toBeLessThanOrEqual(54 * 60);
  });

  it("erreicht alle Knoten von Akt I in einer gültigen Reihenfolge", () => {
    const { milestones } = runBot({ maxSeconds: 3 * 3600, stopAtNode: "a1_grey_banner" });
    const ids = milestones.map((m) => m.id);
    expect(ids[0]).toBe("a1_inheritance");
    expect(ids.at(-1)).toBe("a1_grey_banner");
    expect(new Set(ids).size).toBe(ids.length);
  });
});
