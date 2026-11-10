import type { Decimal } from "./decimal";

/**
 * Rekursiv schreibgeschützte Sicht. Decimal bleibt als Ganzes erhalten:
 * seine Operationen sind ohnehin nicht-mutierend.
 */
export type DeepReadonly<T> = T extends Decimal
  ? T
  : T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepReadonly<U>[]
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

export type Result<E = string> = { readonly ok: true } | { readonly ok: false; readonly reason: E };

export const OK: Result<never> = Object.freeze({ ok: true });

export const fail = <E>(reason: E): Result<E> => ({ ok: false, reason });

/** Baut einen vollständig typisierten Record aus einer Schlüsselliste. */
export function recordFrom<K extends string, V>(keys: readonly K[], value: (key: K) => V): Record<K, V> {
  const out = {} as Record<K, V>;
  for (const key of keys) out[key] = value(key);
  return out;
}
