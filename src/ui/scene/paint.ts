import { FillGradient, type Graphics } from "pixi.js";
import type { SeasonId } from "../../content/living";

/**
 * Malwerkzeuge für die Szene: Farbmischung, Schattierung und wiederkehrende Bauteile.
 * Gebäude werden in leichter Dreiviertelansicht mit Licht von links oben gezeichnet –
 * Vorderseite hell, Seitenwand dunkel, Schlagschatten am Boden.
 */

/** Deterministischer Pseudozufall in [0, 1) – gleiche Szene bei jedem Neuzeichnen. */
export const hash = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43_758.5453;
  return x - Math.floor(x);
};

export const lerpColor = (a: number, b: number, t: number): number => {
  const ch = (shift: number): number => Math.round(((a >> shift) & 255) + ((((b >> shift) & 255) - ((a >> shift) & 255)) * t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/** Abdunkeln (f < 1) oder aufhellen (f > 1) eines Farbtons. */
export const shade = (color: number, f: number): number => (f < 1 ? lerpColor(color, 0x000000, 1 - f) : lerpColor(color, 0xffffff, f - 1));

/** Vertikaler Verlauf als Füllung; Ergebnisse werden je Schlüssel zwischengespeichert. */
export class Gradients {
  private readonly cache = new Map<string, FillGradient>();

  vertical(y0: number, y1: number, top: number, bottom: number): FillGradient {
    const key = `${Math.round(y0)}|${Math.round(y1)}|${top}|${bottom}`;
    let g = this.cache.get(key);
    if (!g) {
      g = new FillGradient({
        type: "linear",
        start: { x: 0, y: y0 },
        end: { x: 0, y: y1 },
        colorStops: [
          { offset: 0, color: top },
          { offset: 1, color: bottom },
        ],
        textureSpace: "global",
      });
      this.cache.set(key, g);
    }
    return g;
  }

  clear(): void {
    this.cache.clear();
  }
}

/** Farben je Jahreszeit: Wiese, Laub, Felder und ob Schnee liegt. */
export interface SeasonPalette {
  readonly grass: number;
  readonly grassDark: number;
  readonly leaves: readonly number[];
  readonly field: number;
  readonly fieldLine: number;
  readonly snow: boolean;
}

export const SEASON_PALETTE: Readonly<Record<SeasonId, SeasonPalette>> = {
  spring: { grass: 0x3c5a2a, grassDark: 0x22331a, leaves: [0x4f7a34, 0x5d8a3c, 0xc79ab0], field: 0x4a5a2a, fieldLine: 0x6e8a3a, snow: false },
  summer: { grass: 0x4a5a26, grassDark: 0x283219, leaves: [0x3f6328, 0x4b7030, 0x35552a], field: 0x9c8433, fieldLine: 0xc4a548, snow: false },
  autumn: { grass: 0x5a5226, grassDark: 0x30291a, leaves: [0xa3532a, 0xc27a2f, 0x7a3a22], field: 0x6b4f2c, fieldLine: 0x8a6838, snow: false },
  winter: { grass: 0xc9ccd2, grassDark: 0x7d828c, leaves: [0x2a3a2e, 0x324238, 0x26332a], field: 0xd4d7dc, fieldLine: 0xaab0ba, snow: true },
};

export const STONE = 0x6e6658;
export const STONE_DARK = 0x463f36;
export const MORTAR = 0x2c2620;
export const TIMBER = 0x3b2616;
export const PLASTER = 0xc9b48e;
export const THATCH = 0x8c6a3a;
export const SLATE = 0x3c4048;
export const WINDOW_LIT = 0xf3b866;
export const WINDOW_DARK = 0x1a140f;

/** Weicher Schlagschatten unter einem Gebäude (Licht von links). */
export function groundShadow(g: Graphics, x: number, ground: number, width: number): void {
  g.ellipse(x + width * 0.6, ground + 1, width * 0.7, Math.max(2, width * 0.08)).fill({ color: 0x000000, alpha: 0.28 });
}

/**
 * Mauerwerk: unregelmäßige Quader mit Helligkeitsstreuung, Fugen und Kantenlicht.
 * `seed` sorgt für ein stabiles Muster pro Bauteil.
 */
export function masonry(g: Graphics, x: number, y: number, w: number, h: number, base: number, seed: number, course = 6): void {
  g.rect(x, y, w, h).fill(shade(base, 0.85));
  const rows = Math.max(1, Math.round(h / course));
  const rh = h / rows;
  for (let r = 0; r < rows; r += 1) {
    let cx = x - (r % 2) * rh * 0.8;
    let i = 0;
    while (cx < x + w) {
      const bw = rh * (1.4 + hash(seed + r * 31 + i) * 1.2);
      const left = Math.max(x, cx);
      const right = Math.min(x + w, cx + bw);
      if (right - left > 0.6) {
        const f = 0.82 + hash(seed + r * 17 + i * 3) * 0.3;
        g.rect(left + 0.4, y + r * rh + 0.4, right - left - 0.8, rh - 0.8).fill(shade(base, f));
        // Oberkante fängt Licht.
        g.rect(left + 0.4, y + r * rh + 0.4, right - left - 0.8, Math.max(0.6, rh * 0.15)).fill({ color: 0xffffff, alpha: 0.06 });
      }
      cx += bw;
      i += 1;
    }
  }
  g.rect(x, y, w, h).stroke({ color: MORTAR, width: 0.6, alpha: 0.6 });
}

/** Seitenwand in Dreiviertelansicht: Parallelogramm nach rechts hinten, dunkler. */
export function sideWall(g: Graphics, x: number, y: number, h: number, depth: number, color: number): void {
  g.poly([x, y, x + depth, y - depth * 0.45, x + depth, y + h - depth * 0.45, x, y + h]).fill(shade(color, 0.6));
}

/** Satteldach mit Stroh oder Schiefer, Ortgang-Kante und Schneeauflage. */
export function gableRoof(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  rise: number,
  depth: number,
  color: number,
  opts: { readonly snow?: boolean; readonly slate?: boolean; readonly burnt?: boolean; readonly seed?: number } = {},
): void {
  const c = opts.burnt ? 0x2a1a12 : color;
  const over = w * 0.08;
  const peakX = x + w / 2;
  // Dachfläche nach hinten (Seite), dann Giebel vorn
  g.poly([peakX, y - rise, peakX + depth, y - rise - depth * 0.45, x + w + over + depth, y - depth * 0.45, x + w + over, y]).fill(shade(c, 0.72));
  g.poly([x - over, y, peakX, y - rise, x + w + over, y]).fill(c);
  // Struktur: Strohbündel bzw. Schieferreihen
  const seed = opts.seed ?? 0;
  if (opts.slate) {
    for (let r = 1; r < 5; r += 1) {
      const yy = y - rise + (rise * r) / 5;
      const half = ((w / 2 + over) * r) / 5;
      g.moveTo(peakX - half, yy).lineTo(peakX + half, yy).stroke({ color: shade(c, 0.6), width: 0.7 });
    }
  } else {
    for (let i = 0; i < 9; i += 1) {
      const t = (i + hash(seed + i) * 0.5) / 9;
      const bx = x - over + (w + over * 2) * t;
      g.moveTo(bx, y).lineTo(peakX + (bx - peakX) * 0.15, y - rise * 0.85).stroke({ color: shade(c, 0.75 + hash(seed + i * 7) * 0.4), width: 0.8, alpha: 0.7 });
    }
  }
  // Ortgang: helle Kante links (Licht), dunkle rechts
  g.moveTo(x - over, y).lineTo(peakX, y - rise).stroke({ color: shade(c, 1.25), width: 1.2 });
  g.moveTo(peakX, y - rise).lineTo(x + w + over, y).stroke({ color: shade(c, 0.55), width: 1 });
  if (opts.snow && !opts.burnt) {
    g.poly([x - over, y, peakX, y - rise, x + w + over, y, peakX, y - rise * 0.55]).fill({ color: 0xeef0f4, alpha: 0.9 });
    g.poly([peakX, y - rise, peakX + depth, y - rise - depth * 0.45, x + w + over + depth, y - depth * 0.45, peakX + depth * 0.5, y - rise * 0.6]).fill({ color: 0xc9ced8, alpha: 0.85 });
  }
}

/** Fachwerkfassade: Putzfeld mit Holzständern, Riegel und Streben. */
export function halfTimber(g: Graphics, x: number, y: number, w: number, h: number, plaster: number, burnt: boolean): void {
  g.rect(x, y, w, h).fill(burnt ? 0x2e231c : plaster);
  // Putz ist unten schmutziger
  g.rect(x, y + h * 0.7, w, h * 0.3).fill({ color: 0x3a2a1a, alpha: 0.18 });
  const beam = burnt ? 0x120c08 : TIMBER;
  const bw = Math.max(1, w * 0.07);
  g.rect(x, y, w, bw).fill(beam);
  g.rect(x, y + h * 0.48, w, bw).fill(beam);
  g.rect(x, y + h - bw, w, bw).fill(beam);
  g.rect(x, y, bw, h).fill(beam);
  g.rect(x + w - bw, y, bw, h).fill(beam);
  g.rect(x + w / 2 - bw / 2, y, bw, h * 0.48).fill(beam);
  g.moveTo(x + bw, y + h * 0.48).lineTo(x + w / 2, y + bw).stroke({ color: beam, width: bw * 0.8 });
  g.moveTo(x + w - bw, y + h * 0.48).lineTo(x + w / 2, y + bw).stroke({ color: beam, width: bw * 0.8 });
}

/** Fenster mit Laibung; `lit` steuert nur die Grundfarbe, das Leuchten macht die Lichtebene. */
export function windowPane(g: Graphics, x: number, y: number, w: number, h: number, lit: boolean): void {
  g.rect(x - 0.6, y - 0.6, w + 1.2, h + 1.2).fill(TIMBER);
  g.rect(x, y, w, h).fill(lit ? WINDOW_LIT : WINDOW_DARK);
  g.rect(x + w / 2 - 0.3, y, 0.6, h).fill({ color: TIMBER, alpha: 0.9 });
}

/** Nadelbaum in zwei Tönen (Licht links, Schatten rechts), optional verschneit. */
export function conifer(g: Graphics, x: number, base: number, height: number, color: number, snow: boolean): void {
  const w = height * 0.38;
  g.rect(x - height * 0.03, base - height * 0.12, height * 0.06, height * 0.12).fill(0x2a1c12);
  for (let t = 0; t < 3; t += 1) {
    const ty = base - height * 0.1 - t * height * 0.28;
    const tw = w * (1 - t * 0.25);
    g.poly([x - tw, ty, x, ty - height * 0.42, x + tw, ty]).fill(color);
    g.poly([x, ty - height * 0.42, x + tw, ty, x + tw * 0.2, ty]).fill(shade(color, 0.7));
    if (snow) g.poly([x - tw * 0.6, ty - height * 0.12, x, ty - height * 0.42, x + tw * 0.3, ty - height * 0.16]).fill({ color: 0xeef0f4, alpha: 0.85 });
  }
}

/** Laubbaum: Krone aus überlappenden Tupfen, im Winter kahle Äste. */
export function broadleaf(g: Graphics, x: number, base: number, height: number, leaves: readonly number[], winter: boolean, seed: number): void {
  const trunk = 0x3a2818;
  g.poly([x - height * 0.04, base, x - height * 0.02, base - height * 0.5, x + height * 0.02, base - height * 0.5, x + height * 0.04, base]).fill(trunk);
  if (winter) {
    for (let b = 0; b < 5; b += 1) {
      const a = -Math.PI / 2 + (hash(seed + b) - 0.5) * 1.6;
      const len = height * (0.25 + hash(seed + b * 3) * 0.2);
      g.moveTo(x, base - height * 0.45).lineTo(x + Math.cos(a) * len, base - height * 0.45 + Math.sin(a) * len).stroke({ color: trunk, width: 1 });
    }
    return;
  }
  const r = height * 0.28;
  for (let i = 0; i < 7; i += 1) {
    const ox = (hash(seed + i) - 0.5) * r * 1.4;
    const oy = (hash(seed + i * 5) - 0.5) * r;
    const color = leaves[Math.floor(hash(seed + i * 11) * leaves.length)] ?? 0x3f6328;
    g.circle(x + ox, base - height * 0.62 + oy, r * (0.55 + hash(seed + i * 2) * 0.35)).fill(ox > 0 ? shade(color, 0.78) : color);
  }
}

/** Fahne bzw. Banner mit Wellenbewegung. */
export function banner(g: Graphics, x: number, y: number, width: number, height: number, t: number, color: number): void {
  const pts: number[] = [x, y];
  for (let s = 1; s <= 6; s += 1) pts.push(x + (width * s) / 6, y + Math.sin(t * 4 + s) * 2 * (s / 6));
  for (let s = 6; s >= 0; s -= 1) pts.push(x + (width * s) / 6, y + height + Math.sin(t * 4 + s) * 2 * (s / 6));
  g.poly(pts).fill(color);
  g.poly(pts).stroke({ color: shade(color, 0.6), width: 0.6 });
}
