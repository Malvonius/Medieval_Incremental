import { describe, expect, it } from "vitest";
import { STYLES, composeBar } from "./music";

describe("Komposition", () => {
  it("ist deterministisch und bleibt in der Tonart des Akts", () => {
    for (let act = 1; act <= STYLES.length; act += 1) {
      const style = STYLES[act - 1];
      if (!style) throw new Error(`Akt ${act} fehlt`);
      const scale = new Set(style.mode.map((s) => s % 12));
      let seed = 7;
      let degree = 7;
      for (let bar = 0; bar < 16; bar += 1) {
        const a = composeBar(act, bar, seed, degree);
        expect(composeBar(act, bar, seed, degree)).toEqual(a);
        const lute = a.notes.filter((n) => n.voice === "lute");
        expect(lute.reduce((sum, n) => sum + n.beats, 0)).toBe(4);
        for (const n of lute) expect(scale.has((((n.midi - style.root) % 12) + 12) % 12)).toBe(true);
        seed = a.rng;
        degree = a.lastDegree;
      }
    }
  });

  it("endet jede Phrase auf dem Grundton", () => {
    const style = STYLES[0];
    const last = composeBar(1, 7, 1, 7).notes.filter((n) => n.voice === "lute").at(-1);
    if (!style || !last) throw new Error("keine Note");
    expect((((last.midi - style.root) % 12) + 12) % 12).toBe(0);
  });
});
