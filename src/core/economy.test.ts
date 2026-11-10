import { describe, expect, it } from "vitest";
import { Decimal } from "./decimal";
import { bulkCost, maxAffordable } from "./economy";

const model = { base: 10, growth: 1.15 };

const naiveSum = (owned: number, amount: number): number => {
  let sum = 0;
  for (let i = 0; i < amount; i += 1) sum += model.base * model.growth ** (owned + i);
  return sum;
};

describe("bulkCost", () => {
  it.each([
    [0, 1],
    [0, 10],
    [7, 25],
    [100, 3],
  ])("entspricht der Einzelsumme (owned=%i, amount=%i)", (owned, amount) => {
    expect(bulkCost(model, owned, amount).toNumber()).toBeCloseTo(naiveSum(owned, amount), 6);
  });

  it("kostet für 0 Einheiten nichts", () => {
    expect(bulkCost(model, 5, 0).eq(0)).toBe(true);
  });

  it("lehnt ungültige Eingaben ab", () => {
    expect(() => bulkCost(model, -1, 1)).toThrow(RangeError);
    expect(() => bulkCost(model, 0, 1.5)).toThrow(RangeError);
    expect(() => bulkCost({ base: 10, growth: 1 }, 0, 1)).toThrow(RangeError);
  });
});

describe("maxAffordable", () => {
  it.each([0, 1, 9.99, 10, 11.5, 1_000, 123_456, 1e12])("findet das größte bezahlbare k (cash=%d)", (cash) => {
    for (const owned of [0, 3, 40]) {
      const k = maxAffordable(model, owned, cash);
      expect(bulkCost(model, owned, k).lte(cash)).toBe(true);
      expect(bulkCost(model, owned, k + 1).gt(cash)).toBe(true);
    }
  });

  it("funktioniert mit sehr großen Zahlen", () => {
    const k = maxAffordable(model, 0, new Decimal("1e300"));
    expect(k).toBeGreaterThan(4_000);
    expect(bulkCost(model, 0, k).lte("1e300")).toBe(true);
  });
});
