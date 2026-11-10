/**
 * Mulberry32: schneller, deterministischer 32-Bit-PRNG. Der Zustand liegt im Spielstand,
 * damit Bot, Tests und Offline-Fortschritt reproduzierbar bleiben.
 * Gibt [Zufallszahl in [0, 1), neuer Zustand] zurück – keine versteckte Mutation.
 */
export function nextRandom(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4_294_967_296, next];
}
