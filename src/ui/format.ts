import { type DecimalSource, toDecimal } from "../core/decimal";

const SUFFIXES = ["", " Tsd.", " Mio.", " Mrd.", " Bio.", " Brd.", " Trill.", " Trd."] as const;

const fixed = (value: number, digits: number): string =>
  value.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** 1234 → „1,23 Tsd.“, 5e30 → „5,00e30“. Kleine Werte mit höchstens einer Nachkommastelle. */
export function formatNumber(source: DecimalSource): string {
  const value = toDecimal(source);
  if (value.lt(0)) return `-${formatNumber(value.neg())}`;
  if (value.lt(1_000)) {
    const n = value.toNumber();
    return Number.isInteger(n) ? fixed(n, 0) : fixed(Math.floor(n * 10) / 10, 1);
  }
  const group = Math.floor(value.exponent / 3);
  const suffix = SUFFIXES[group];
  if (suffix !== undefined) return `${fixed(value.toNumber() / 10 ** (group * 3), 2)}${suffix}`;
  return `${fixed(value.mantissa, 2)}e${value.exponent}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return `${m} min ${String(sec).padStart(2, "0")} s`;
  return `${sec} s`;
}

export const formatPercent = (fraction: number): string => `${fixed(fraction * 100, 0)} %`;
