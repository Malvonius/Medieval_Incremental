import { Application, FillGradient, Graphics } from "pixi.js";
import { MAX_HOUSES, type SceneModel } from "./model";

/** Himmel je Akt (oben → Horizont): von Abenddämmerung bis Blutmond. */
const SKY: readonly (readonly [number, number])[] = [
  [0x141a2a, 0x3a2a26],
  [0x10141f, 0x2c2230],
  [0x0c1018, 0x1f2a2a],
  [0x140c10, 0x3a1c18],
  [0x12060a, 0x4a1410],
];
const C = {
  stone: 0x3b3229,
  stoneDark: 0x2a231d,
  mortar: 0x221c17,
  plaster: 0x8a7a62,
  beam: 0x3a2618,
  thatch: 0x6b5233,
  thatchLight: 0x8a6c42,
  burnt: 0x4a2414,
  window: 0xf2b45a,
  hill: 0x15120f,
  hillFar: 0x1c1915,
  ground: 0x0f0c0a,
  gold: 0xd4a54a,
} as const;

/** Länge eines Spieltags in Sekunden (Echtzeit). */
const DAY_SECONDS = 240;
/** Tageshimmel (oben, Horizont), in den je nach Tageszeit überblendet wird. */
const DAY_SKY: readonly [number, number] = [0x4f6f94, 0xc9a477];

const lerpColor = (a: number, b: number, t: number): number => {
  const ch = (shift: number): number => Math.round(((a >> shift) & 255) + ((((b >> shift) & 255) - ((a >> shift) & 255)) * t));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
  size: number;
  readonly grow: number;
  /** Regentropfen werden als Strich gezeichnet. */
  readonly streak?: boolean;
}

/** Deterministischer Pseudozufall je Index: Häuser sehen bei jedem Neuzeichnen gleich aus. */
const hash = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43_758.5453;
  return x - Math.floor(x);
};

/**
 * Prozedurale Seitenansicht von Vhal in drei Ebenen:
 * `world` (statisch, nur bei Modelländerung), `anim` (Fahne, Mühle, Sterne, Fenster) und `fx` (Partikel).
 */
export class SceneRenderer {
  private readonly app = new Application();
  private readonly sky = new Graphics();
  private readonly world = new Graphics();
  private readonly gradients = new Map<string, FillGradient>();
  private readonly anim = new Graphics();
  private readonly fx = new Graphics();
  private particles: Particle[] = [];
  private model: SceneModel | null = null;
  private animate = true;
  private time = 0;

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: devicePixelRatio });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.sky, this.world, this.anim, this.fx);
    this.app.renderer.on("resize", () => this.draw());
    this.app.ticker.add((t) => this.step(t.deltaMS / 1000));
  }

  setAnimate(animate: boolean): void {
    this.animate = animate;
    if (!animate) {
      this.particles = [];
      this.fx.clear();
      this.drawAnim();
    }
  }

  update(model: SceneModel): void {
    this.model = model;
    this.draw();
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }

  private get size(): { w: number; h: number; ground: number } {
    const { width: w, height: h } = this.app.screen;
    return { w, h, ground: h * 0.84 };
  }

  // ── Statische Ebene ─────────────────────────────────────────────────────────

  private draw(): void {
    const m = this.model;
    if (!m) return;
    const g = this.world.clear();
    this.gradients.clear();
    this.drawLand(g);
    this.drawKeep(g, m);
    this.drawHouses(g, m);
    if (m.market) this.drawMarket(g);
    if (m.forge) this.drawForge(g);
    if (m.chapel) this.drawChapel(g, m);
    this.drawWalls(g, m);
    this.drawDead(g, m);
    this.drawAnim();
  }

  /** 0 = Mitternacht, 0,5 = Mittag. Ohne Animation bleibt es Nacht. */
  private get phase(): number {
    return this.animate ? (this.time / DAY_SECONDS + 0.75) % 1 : 0;
  }

  /** 1 = tiefe Nacht, 0 = heller Tag; Wetter und späte Akte dämpfen das Tageslicht. */
  private night(m: SceneModel): number {
    const daylight = (1 - Math.cos(this.phase * Math.PI * 2)) / 2;
    const cap = m.weather === "clear" ? 1 - (m.act - 1) * 0.12 : 0.45;
    return 1 - daylight * Math.max(0.2, cap);
  }

  private drawSky(m: SceneModel): void {
    const { w, h } = this.size;
    const g = this.sky.clear();
    const [nTop, nBottom] = m.ending === "light" ? [0x2a3346, 0x8a6a42] : (SKY[m.act - 1] ?? [0x141a2a, 0x3a2a26]);
    const step = Math.round((1 - this.night(m)) * 32) / 32;
    // Verläufe werden je Helligkeitsstufe zwischengespeichert statt jedes Frame neu erzeugt.
    const key = `${m.act}-${m.ending}-${step}-${h}`;
    let gradient = this.gradients.get(key);
    if (!gradient) {
      gradient = new FillGradient(0, 0, 0, h);
      gradient.addColorStop(0, lerpColor(nTop, DAY_SKY[0], step));
      gradient.addColorStop(1, lerpColor(nBottom, DAY_SKY[1], step));
      this.gradients.set(key, gradient);
    }
    g.rect(0, 0, w, h).fill(gradient);

    // Sonne und Mond auf gegenüberliegenden Bahnen
    const arc = (offset: number): { x: number; y: number; up: number } => {
      const a = (this.phase + offset) * Math.PI * 2;
      return { x: w * (0.5 - Math.sin(a) * 0.42), y: h * (0.62 + Math.cos(a) * 0.5), up: -Math.cos(a) };
    };
    const r = h * 0.08;
    const moon = arc(0);
    if (moon.up > -0.2) {
      const red = m.act >= 5 && m.ending !== "light";
      for (let i = 4; i >= 1; i -= 1) g.circle(moon.x, moon.y, r * (1 + i * 0.35)).fill({ color: red ? 0xa3302a : 0xd8cfb8, alpha: 0.04 });
      g.circle(moon.x, moon.y, r).fill(red ? 0xb8402f : 0xe2d9c2);
      g.circle(moon.x - r * 0.3, moon.y - r * 0.2, r * 0.18).fill({ color: 0x000000, alpha: 0.08 });
    }
    const sun = arc(0.5);
    if (sun.up > -0.2 && m.weather === "clear") {
      for (let i = 5; i >= 1; i -= 1) g.circle(sun.x, sun.y, r * (1 + i * 0.5)).fill({ color: 0xffd98a, alpha: 0.05 });
      g.circle(sun.x, sun.y, r * 0.9).fill(0xffe2a0);
    }
    if (m.weather !== "clear") g.rect(0, 0, w, h).fill({ color: m.weather === "rain" ? 0x1a2028 : 0x8a8a90, alpha: 0.25 });
  }

  private drawLand(g: Graphics): void {
    const { w, h, ground } = this.size;
    // Ferne Berge, nahe Hügel mit Wald, Boden
    g.poly([0, ground, w * 0.08, h * 0.5, w * 0.18, h * 0.62, w * 0.3, h * 0.46, w * 0.46, h * 0.64, w * 0.6, h * 0.5, w * 0.75, h * 0.62, w * 0.9, h * 0.48, w, h * 0.58, w, ground]).fill(C.hillFar);
    g.poly([0, ground, w * 0.15, h * 0.66, w * 0.35, ground - h * 0.06, w * 0.55, h * 0.68, w * 0.8, ground - h * 0.05, w, h * 0.7, w, ground]).fill(C.hill);
    for (let i = 0; i < 70; i += 1) {
      const x = hash(i) * w;
      const th = h * (0.06 + hash(i + 99) * 0.07);
      const baseY = ground - h * 0.03 - hash(i + 7) * h * 0.05;
      g.poly([x - th * 0.22, baseY, x, baseY - th, x + th * 0.22, baseY]).fill(0x0e1210);
    }
    g.rect(0, ground, w, h - ground).fill(C.ground);
    g.rect(0, ground, w, 2).fill({ color: 0x2a221a, alpha: 0.8 });
    // Kopfsteinpflaster entlang der Hauptstraße
    const road = ground + (h - ground) * 0.45;
    for (let x = 0, i = 0; x < w; x += 7 + hash(i) * 6, i += 1) {
      const stoneW = 5 + hash(i + 1) * 5;
      g.roundRect(x, road + (i % 2) * 3 - 2, stoneW, 3.5, 1.5).fill({ color: 0x2a231c, alpha: 0.7 + hash(i + 2) * 0.3 });
    }
    for (let i = 0; i < 30; i += 1) {
      const x = hash(i + 500) * w;
      g.rect(x, ground + 2 + hash(i + 600) * (h - ground) * 0.3, 1, 3 + hash(i + 700) * 3).fill({ color: 0x2c3a22, alpha: 0.8 });
    }
  }

  /** Mauerwerk mit versetzten Fugen. */
  private bricks(g: Graphics, x: number, y: number, w: number, h: number, row: number): void {
    g.rect(x, y, w, h).fill(C.stone);
    for (let yy = y + row, r = 0; yy < y + h; yy += row, r += 1) {
      g.rect(x, yy, w, 1).fill({ color: C.mortar, alpha: 0.7 });
      const off = r % 2 === 0 ? 0 : row;
      for (let xx = x + off; xx < x + w; xx += row * 2) g.rect(xx, yy - row, 1, row).fill({ color: C.mortar, alpha: 0.5 });
    }
    g.rect(x + w - 2, y, 2, h).fill({ color: 0x000000, alpha: 0.25 });
  }

  private drawKeep(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const kx = w * 0.08;
    const kw = Math.max(46, w * 0.07);
    const top = h * 0.26;
    this.bricks(g, kx, top, kw, ground - top, Math.max(4, h * 0.03));
    // Zinnen
    const merlon = kw / 7;
    for (let i = 0; i < 4; i += 1) g.rect(kx + i * merlon * 2, top - h * 0.05, merlon, h * 0.05).fill(C.stone);
    // Seitenturm
    const tx = kx - kw * 0.45;
    this.bricks(g, tx, top + h * 0.12, kw * 0.45, ground - top - h * 0.12, Math.max(4, h * 0.03));
    g.poly([tx - 3, top + h * 0.12, tx + kw * 0.225, top - h * 0.02, tx + kw * 0.45 + 3, top + h * 0.12]).fill(0x3a2a20);
    // Tor
    const gw = kw * 0.34;
    g.roundRect(kx + kw / 2 - gw / 2, ground - h * 0.16, gw, h * 0.16, gw / 2).fill(0x120d0a);
    for (let i = 1; i < 4; i += 1) g.rect(kx + kw / 2 - gw / 2 + (gw * i) / 4, ground - h * 0.14, 1, h * 0.14).fill({ color: 0x3a2a1c, alpha: 0.8 });
    // Fahnenmast
    g.rect(kx + kw / 2 - 1, top - h * 0.22, 2, h * 0.17).fill(0x2a2018);
    if (m.burning) g.rect(kx, top, kw, (ground - top) * 0.3).fill({ color: 0x000000, alpha: 0.35 });
  }

  private drawHouses(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const left = w * 0.19;
    const span = w * 0.34;
    for (let i = 0; i < m.houses; i += 1) {
      const back = i % 3 === 1;
      const x = left + (i / MAX_HOUSES) * span + (back ? span / MAX_HOUSES / 2 : 0);
      const hw = w * (0.016 + hash(i) * 0.008) * (back ? 0.8 : 1);
      const hh = h * (0.09 + hash(i + 3) * 0.05) * (back ? 0.8 : 1);
      const base = ground - (back ? h * 0.025 : 0);
      const tint = back ? 0.75 : 1;
      // Fachwerk: Putz, Balken, Kreuzstreben
      g.rect(x, base - hh, hw, hh).fill({ color: C.plaster, alpha: tint });
      g.rect(x, base - hh, hw, 2).fill(C.beam);
      g.rect(x, base - hh * 0.5, hw, 2).fill(C.beam);
      g.rect(x, base - hh, 2, hh).fill(C.beam);
      g.rect(x + hw - 2, base - hh, 2, hh).fill(C.beam);
      g.moveTo(x, base - hh * 0.5).lineTo(x + hw / 2, base - hh).stroke({ color: C.beam, width: 1.5 });
      g.moveTo(x + hw, base - hh * 0.5).lineTo(x + hw / 2, base - hh).stroke({ color: C.beam, width: 1.5 });
      // Strohdach mit hellem Rand
      const roofH = hh * (0.55 + hash(i + 5) * 0.3);
      const roof = m.burning ? C.burnt : C.thatch;
      g.poly([x - hw * 0.15, base - hh, x + hw / 2, base - hh - roofH, x + hw * 1.15, base - hh]).fill({ color: roof, alpha: tint });
      g.moveTo(x - hw * 0.15, base - hh).lineTo(x + hw / 2, base - hh - roofH).stroke({ color: m.burning ? 0x7a3a1a : C.thatchLight, width: 1.5 });
      // Schornstein
      if (hash(i + 11) > 0.55) g.rect(x + hw * 0.68, base - hh - roofH * 0.7, hw * 0.14, roofH * 0.5).fill(C.stoneDark);
      // Tür
      g.rect(x + hw * 0.38, base - hh * 0.38, hw * 0.24, hh * 0.38).fill(C.beam);
    }
  }

  private drawMarket(g: Graphics): void {
    const { w, h, ground } = this.size;
    const colors = [0x8a2a22, 0x2f4a6a, 0x6a5a22];
    for (let i = 0; i < 3; i += 1) {
      const x = w * (0.565 + i * 0.022);
      const sw = w * 0.018;
      g.rect(x, ground - h * 0.08, 1.5, h * 0.08).fill(C.beam);
      g.rect(x + sw, ground - h * 0.08, 1.5, h * 0.08).fill(C.beam);
      g.poly([x - 2, ground - h * 0.08, x + sw / 2, ground - h * 0.12, x + sw + 3, ground - h * 0.08]).fill(colors[i] ?? 0x8a2a22);
      g.rect(x + 1, ground - h * 0.035, sw, h * 0.035).fill(0x4a3424);
    }
  }

  private drawForge(g: Graphics): void {
    const { w, h, ground } = this.size;
    const fx = w * 0.64;
    const fw = w * 0.045;
    this.bricks(g, fx, ground - h * 0.13, fw, h * 0.13, Math.max(3, h * 0.025));
    g.poly([fx - 3, ground - h * 0.13, fx + fw / 2, ground - h * 0.2, fx + fw + 3, ground - h * 0.13]).fill(0x2e221a);
    this.bricks(g, fx + fw * 0.7, ground - h * 0.27, fw * 0.2, h * 0.1, 3);
    // Glühende Esse in der offenen Tür
    const door = new FillGradient(0, ground - h * 0.07, 0, ground);
    door.addColorStop(0, 0x5a1a08);
    door.addColorStop(1, 0xe07b39);
    g.roundRect(fx + fw * 0.3, ground - h * 0.07, fw * 0.4, h * 0.07, 3).fill(door);
  }

  private drawChapel(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const cx = w * 0.71;
    const cw = w * 0.06;
    this.bricks(g, cx, ground - h * 0.18, cw, h * 0.18, Math.max(3, h * 0.025));
    g.poly([cx - 4, ground - h * 0.18, cx + cw / 2, ground - h * 0.3, cx + cw + 4, ground - h * 0.18]).fill(0x2a2a30);
    // Rosettenfenster
    const rx = cx + cw / 2;
    const ry = ground - h * 0.11;
    g.circle(rx, ry, h * 0.028).fill(m.ending === "ash" ? 0x4a2a5a : 0x7a3a2a);
    for (let a = 0; a < 8; a += 1) {
      g.moveTo(rx, ry).lineTo(rx + Math.cos((a * Math.PI) / 4) * h * 0.028, ry + Math.sin((a * Math.PI) / 4) * h * 0.028).stroke({ color: 0x1a1410, width: 1 });
    }
    // Glockenturm mit spitzem Helm und Kreuz
    const tx = cx + cw;
    const tw = cw * 0.32;
    const towerTop = m.tower ? ground - h * 0.42 : ground - h * 0.26;
    this.bricks(g, tx, towerTop, tw, ground - towerTop, 3);
    g.poly([tx - 2, towerTop, tx + tw / 2, towerTop - h * 0.12, tx + tw + 2, towerTop]).fill(0x2a2a30);
    g.rect(tx + tw * 0.3, towerTop + h * 0.03, tw * 0.4, h * 0.05).fill(0x120d0a);
    g.rect(tx + tw / 2 - 1, towerTop - h * 0.18, 2, h * 0.07).fill(C.gold);
    g.rect(tx + tw / 2 - 4, towerTop - h * 0.16, 8, 2).fill(C.gold);
  }

  private drawWalls(g: Graphics, m: SceneModel): void {
    if (m.walls === 0) return;
    const { w, h, ground } = this.size;
    const height = h * (0.07 + m.walls * 0.011);
    for (let i = 0; i < m.walls * 3; i += 1) {
      const x = w * 0.8 + i * 4.5;
      const ph = height * (0.9 + hash(i) * 0.2);
      g.poly([x, ground, x, ground - ph, x + 1.75, ground - ph - 5, x + 3.5, ground - ph, x + 3.5, ground]).fill(i % 2 ? 0x3a2a1c : 0x45321f);
    }
    g.rect(w * 0.8, ground - height * 0.5, m.walls * 13.5, 2).fill(0x2a1e14);
  }

  private drawDead(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    for (let i = 0; i < m.dead; i += 1) {
      const x = w * 0.865 + hash(i) * w * 0.13;
      const y = ground - (i % 4);
      const dh = h * (0.06 + hash(i + 50) * 0.02);
      g.rect(x, y - dh, 3.5, dh).fill(0x0a0908);
      g.circle(x + 1.75, y - dh - 2.5, 2.6).fill(0x0a0908);
      if (i % 3 === 0) g.rect(x - 1, y - dh * 1.5, 1, dh * 1.4).fill(0x1a1612); // Speer
    }
  }

  // ── Animierte Ebene ─────────────────────────────────────────────────────────

  private drawAnim(): void {
    const m = this.model;
    if (!m) return;
    const { w, h, ground } = this.size;
    this.drawSky(m);
    const g = this.anim.clear();
    const t = this.animate ? this.time : 0;
    const night = this.night(m);
    // Funkelnde Sterne – nur bei Nacht und klarem Himmel
    const starAlpha = m.weather === "clear" ? Math.max(0, night - 0.35) / 0.65 : 0;
    for (let i = 0; starAlpha > 0 && i < 40; i += 1) {
      const twinkle = 0.35 + 0.35 * Math.sin(t * (0.8 + hash(i) * 2) + i);
      g.circle(hash(i + 200) * w, hash(i + 300) * h * 0.45, hash(i + 400) > 0.85 ? 1.3 : 0.8).fill({ color: 0xffffff, alpha: twinkle * starAlpha * 0.8 });
    }
    // Wehende Fahne am Burgfried
    const kx = w * 0.08 + Math.max(46, w * 0.07) / 2;
    const fy = h * 0.04;
    const fw = h * 0.16;
    const pts: number[] = [kx + 1, fy];
    for (let s = 1; s <= 6; s += 1) pts.push(kx + 1 + (fw * s) / 6, fy + Math.sin(t * 4 + s) * 2.5 * (s / 6));
    for (let s = 6; s >= 0; s -= 1) pts.push(kx + 1 + (fw * s) / 6, fy + h * 0.09 + Math.sin(t * 4 + s) * 2.5 * (s / 6));
    g.poly(pts).fill(m.ending === "ash" ? 0x3a3a40 : 0x8a2a22);
    // Windmühle
    if (m.mill) {
      const mx = w * 0.6;
      const my = ground - h * 0.2;
      g.poly([mx - 7, ground, mx - 4, my, mx + 4, my, mx + 7, ground]).fill(C.plaster);
      g.poly([mx - 6, my, mx, my - 8, mx + 6, my]).fill(C.thatch);
      for (let b = 0; b < 4; b += 1) {
        const a = t * 0.8 + (b * Math.PI) / 2;
        const ex = mx + Math.cos(a) * h * 0.13;
        const ey = my + Math.sin(a) * h * 0.13;
        g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: 0x3a2618, width: 2 });
        g.poly([mx + Math.cos(a) * h * 0.04, my + Math.sin(a) * h * 0.04, ex, ey, ex + Math.cos(a + 0.4) * 5, ey + Math.sin(a + 0.4) * 5]).fill({ color: 0xc8b898, alpha: 0.85 });
      }
      g.circle(mx, my, 2).fill(0x2a1e14);
    }
    // Flackernde Fenster im Dorf
    const left = w * 0.19;
    const span = w * 0.34;
    for (let i = 0; i < m.houses; i += 1) {
      if (i % 3 === 1 || m.burning) continue;
      const x = left + (i / MAX_HOUSES) * span;
      const hw = w * (0.016 + hash(i) * 0.008);
      const hh = h * (0.09 + hash(i + 3) * 0.05);
      const lit = (0.55 + 0.35 * Math.sin(t * (2 + hash(i + 8) * 3) + i)) * (0.15 + night * 0.85);
      g.rect(x + hw * 0.12, ground - hh * 0.82, hw * 0.2, hh * 0.18).fill({ color: C.window, alpha: lit });
    }
    // Schießscharten im Burgfried
    const kxl = w * 0.08;
    const kw = Math.max(46, w * 0.07);
    for (let i = 0; i < 3; i += 1) {
      g.rect(kxl + kw * (0.2 + i * 0.25), h * 0.36 + (i % 2) * h * 0.12, 3, h * 0.06).fill({ color: C.window, alpha: 0.5 + 0.3 * Math.sin(t * 1.5 + i) });
    }
  }

  // ── Partikel ────────────────────────────────────────────────────────────────

  private spawn(): void {
    const m = this.model;
    if (!m || this.particles.length > 420) return;
    const { w, h, ground } = this.size;
    if (m.forge && Math.random() < (m.forging ? 0.45 : 0.12)) {
      this.particles.push({ x: w * 0.64 + w * 0.045 * 0.8, y: ground - h * 0.27, vx: 3 + Math.random() * 6, vy: -8 - Math.random() * 8, life: 3.5, color: 0x6a6058, size: 1.5 + Math.random() * 2, grow: 1.2 });
    }
    if (m.forge && m.forging && Math.random() < 0.25) {
      this.particles.push({ x: w * 0.64 + w * 0.0225, y: ground - h * 0.04, vx: (Math.random() - 0.5) * 30, vy: -25 - Math.random() * 25, life: 0.6, color: 0xffb04a, size: 1, grow: 0 });
    }
    if (m.burning && Math.random() < 0.9) {
      this.particles.push({ x: w * 0.2 + Math.random() * w * 0.36, y: ground - h * 0.12, vx: (Math.random() - 0.5) * 8, vy: -22 - Math.random() * 22, life: 1.6, color: Math.random() < 0.5 ? 0xe07b39 : 0xffc35a, size: 1.4, grow: -0.5 });
    }
    if (m.weather === "rain") {
      for (let i = 0; i < 4; i += 1) {
        this.particles.push({ x: Math.random() * w * 1.1, y: -5, vx: -40, vy: 260 + Math.random() * 80, life: 1, color: 0x9ab0c8, size: 1, grow: 0, streak: true });
      }
    } else if (m.weather === "snow" && Math.random() < 0.7) {
      this.particles.push({ x: Math.random() * w, y: -4, vx: (Math.random() - 0.5) * 10, vy: 14 + Math.random() * 14, life: 14, color: 0xf2f2f2, size: 1 + Math.random() * 1.3, grow: 0 });
    }
    if (m.souls && Math.random() < 0.18) {
      this.particles.push({ x: w * 0.69 + Math.random() * w * 0.1, y: ground + 4, vx: (Math.random() - 0.5) * 4, vy: -7 - Math.random() * 4, life: 4.5, color: 0x8fb8c9, size: 1.6, grow: 0 });
    }
  }

  private step(dt: number): void {
    if (!this.animate) return;
    this.time += dt;
    this.drawAnim();
    this.spawn();
    const g = this.fx.clear();
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0 && p.y < this.size.h + 10);
    for (const p of this.particles) {
      const sway = p.color === 0x8fb8c9 || p.color === 0xf2f2f2 ? Math.sin(this.time * 2 + p.y * 0.05) * 0.3 : 0;
      p.x += p.vx * dt + sway;
      p.y += p.vy * dt;
      p.size = Math.max(0.4, p.size + p.grow * dt);
      if (p.streak) g.moveTo(p.x, p.y).lineTo(p.x - 2, p.y + 9).stroke({ color: p.color, width: 1, alpha: 0.55 });
      else g.circle(p.x, p.y, p.size).fill({ color: p.color, alpha: Math.min(1, p.life) * 0.75 });
    }
  }
}
