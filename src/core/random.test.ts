import { describe, expect, it } from "vitest";
import { nextRandom } from "./random";

describe("nextRandom", () => {
  it("ist deterministisch und liegt in [0, 1)", () => {
    let s = 42;
    const a: number[] = [];
    for (let i = 0; i < 1_000; i += 1) {
      const [r, n] = nextRandom(s);
      a.push(r);
      s = n;
    }
    expect(a.every((r) => r >= 0 && r < 1)).toBe(true);
    expect(nextRandom(42)).toEqual(nextRandom(42));
    const mean = a.reduce((x, y) => x + y, 0) / a.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});
