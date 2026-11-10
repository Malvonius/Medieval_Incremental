import Decimal from "break_infinity.js";

export { Decimal };

export type DecimalSource = Decimal | number | string;

export const ZERO: Decimal = new Decimal(0);

export const toDecimal = (value: DecimalSource): Decimal =>
  value instanceof Decimal ? value : new Decimal(value);

/** Strenge Prüfung für Werte aus untrusted Quellen (Spielstände). */
export const isFiniteDecimal = (value: Decimal): boolean =>
  Number.isFinite(value.mantissa) && Number.isFinite(value.exponent);
