import { type DecimalSource, toDecimal } from "../core/decimal";

let notation: "suffix" | "scientific" = "suffix";

/** Wird von den Einstellungen gesetzt; gilt global für alle Zahlenanzeigen. */
export const setNotation = (value: "suffix" | "scientific"): void => {
  notation = value;
};

const SUFFIXES = ["", " Tsd.", " Mio.", " Mrd.", " Bio.", " Brd.", " Trill.", " Trd."] as const;

const fixed = (value: number, digits: number): string =>
  value.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** 1234 → „1,23 Tsd.“, 5e30 → „5,00e30“. Werte unter 1 mit zwei, sonst höchstens einer Nachkommastelle. */
export function formatNumber(source: DecimalSource): string {
  const value = toDecimal(source);
  if (value.lt(0)) return `-${formatNumber(value.neg())}`;
  if (value.lt(1_000)) {
    const n = value.toNumber();
    if (Number.isInteger(n)) return fixed(n, 0);
    return n < 1 ? fixed(Math.floor(n * 100) / 100, 2) : fixed(Math.floor(n * 10) / 10, 1);
  }
  const group = Math.floor(value.exponent / 3);
  const suffix = notation === "suffix" ? SUFFIXES[group] : undefined;
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

/** Unter 10 % mit einer Nachkommastelle, damit kleine Boni (z. B. 0,5 %) nicht zu „1 %“ werden. */
export function formatPercent(fraction: number): string {
  const percent = fraction * 100;
  const digits = Math.abs(percent) < 10 && !Number.isInteger(percent) ? 1 : 0;
  return `${percent.toLocaleString("de-DE", { maximumFractionDigits: digits })} %`;
}
