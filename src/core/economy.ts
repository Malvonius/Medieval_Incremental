import { Decimal, type DecimalSource, ZERO, toDecimal } from "./decimal";

export interface GeometricCost {
  /** Kosten der ersten Einheit. */
  readonly base: number;
  /** Wachstumsfaktor r > 1 pro gekaufter Einheit. */
  readonly growth: number;
}

function assertCostModel({ base, growth }: GeometricCost): void {
  if (!(base > 0) || !Number.isFinite(base)) throw new RangeError(`base muss > 0 sein, war ${base}`);
  if (!(growth > 1) || !Number.isFinite(growth)) throw new RangeError(`growth muss > 1 sein, war ${growth}`);
}

function assertCount(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} muss eine nicht-negative Ganzzahl sein, war ${value}`);
  }
}

/**
 * Summe der Kosten für `amount` Einheiten ab Besitzstand `owned`:
 *   base · r^owned · (r^amount − 1) / (r − 1)      — O(1)
 */
export function bulkCost(model: GeometricCost, owned: number, amount: number): Decimal {
  assertCostModel(model);
  assertCount("owned", owned);
  assertCount("amount", amount);
  if (amount === 0) return ZERO;
  const { base, growth } = model;
  return Decimal.pow(growth, owned)
    .mul(base)
    .mul(Decimal.pow(growth, amount).sub(1))
    .div(growth - 1);
}

/**
 * Größtes k mit bulkCost(owned, k) ≤ cash. Geschlossene Form über den Logarithmus,
 * danach Korrektur um ±1 gegen Gleitkomma-Rundung — O(1).
 */
export function maxAffordable(model: GeometricCost, owned: number, cashSource: DecimalSource): number {
  assertCostModel(model);
  assertCount("owned", owned);
  const cash = toDecimal(cashSource);
  if (cash.lte(0)) return 0;

  const { base, growth } = model;
  const firstUnit = Decimal.pow(growth, owned).mul(base);
  const ratio = cash.mul(growth - 1).div(firstUnit).add(1);
  let k = Math.max(0, Math.floor(Decimal.log10(ratio) / Math.log10(growth)));
  if (!Number.isSafeInteger(k)) return Number.MAX_SAFE_INTEGER;

  while (k > 0 && bulkCost(model, owned, k).gt(cash)) k -= 1;
  while (bulkCost(model, owned, k + 1).lte(cash)) k += 1;
  return k;
}
