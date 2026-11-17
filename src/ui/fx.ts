import { writable } from "svelte/store";

/** Aufsteigende Zahlen, Münzen und Lichtblitze – reine Darstellung, ohne Spiellogik. */
export type FloatKind = "gold" | "buy" | "gift";

export interface Floater {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly kind: FloatKind;
  /** Anzahl der Münzen, die mitfliegen. */
  readonly coins: number;
}

export const floaters = writable<readonly Floater[]>([]);
/** Zähler für Lichtblitze; jede Erhöhung löst einen Blitz aus. */
export const flashes = writable(0);

const LIFETIME_MS = 1100;
const MAX_FLOATERS = 24;
let nextId = 0;

/** Lässt an einem Element (oder Punkt) Text und Münzen aufsteigen. */
export function floatAt(target: Element | { x: number; y: number }, text: string, kind: FloatKind = "gold", coins = 0): void {
  const point = target instanceof Element ? centerOf(target) : target;
  const id = nextId++;
  // Die Anzahl ist gedeckelt, damit schnelles Klicken das DOM nicht flutet.
  floaters.update((list) => [...list.slice(-(MAX_FLOATERS - 1)), { id, ...point, text, kind, coins }]);
  setTimeout(() => floaters.update((list) => list.filter((f) => f.id !== id)), LIFETIME_MS);
}

function centerOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 3 };
}

export const flash = (): void => flashes.update((n) => n + 1);
