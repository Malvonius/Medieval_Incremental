import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { formatDuration, formatNumber, formatPercent } from "./format";

describe("formatNumber", () => {
  it.each([
    [0, "0"],
    [12.37, "12,3"],
    [0.05, "0,05"],
    [999, "999"],
    [1_234, "1,23 Tsd."],
    [5_600_000, "5,60 Mio."],
    [-1_500, "-1,50 Tsd."],
  ])("%d → %s", (input, expected) => {
    expect(formatNumber(input)).toBe(expected);
  });

  it("nutzt wissenschaftliche Notation für sehr große Zahlen", () => {
    expect(formatNumber(new Decimal("4.2e40"))).toBe("4,20e40");
  });
});

describe("formatPercent", () => {
  it.each([
    [0.005, "0,5 %"],
    [0.03, "3 %"],
    [0.2, "20 %"],
    [8.444, "844 %"],
  ])("%d → %s", (input, expected) => {
    expect(formatPercent(input)).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    [42, "42 s"],
    [125, "2 min 05 s"],
    [3_725, "1 h 02 min"],
  ])("%d s → %s", (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });
});
