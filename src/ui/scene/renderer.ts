import {
  Application,
  BlurFilter,
  ColorMatrixFilter,
  Container,
  Graphics,
  Particle as Sprite,
  ParticleContainer,
  Rectangle,
  type Texture,
} from "pixi.js";
import type { TileId } from "../../content/ids";
import { MAX_HOUSES, type SceneDynamics, type SceneModel } from "./model";
import {
  Gradients,
  PLASTER,
  SEASON_PALETTE,
  SLATE,
  STONE,
  STONE_DARK,
  THATCH,
  TIMBER,
  banner,
  broadleaf,
  conifer,
  gableRoof,
  groundShadow,
  halfTimber,
  hash,
  lerpColor,
  masonry,
  shade,
  sideWall,
  windowPane,
} from "./paint";

/** Himmel je Akt (oben → Horizont): von Abenddämmerung bis Blutmond. */
const SKY: readonly (readonly [number, number])[] = [
  [0x141a2a, 0x3a2a26],
  [0x10141f, 0x2c2230],
  [0x0c1018, 0x1f2a2a],
  [0x140c10, 0x3a1c18],
  [0x12060a, 0x4a1410],
];
/** Länge eines Spieltags in Sekunden (Echtzeit). */
const DAY_SECONDS = 240;
/** Tageshimmel (oben, Horizont), in den je nach Tageszeit überblendet wird. */
const DAY_SKY: readonly [number, number] = [0x5a7ea6, 0xd8b483];
/** Himmel, Sonne und Mond ändern sich langsam: höchstens zehnmal pro Sekunde neu zeichnen. */
const SKY_INTERVAL = 0.1;
/** Radius der Punkt-Textur in Pixeln; Partikelgrößen skalieren relativ dazu. */
const DOT_RADIUS = 4;
/** Größte Verschiebung der vordersten Ebene durch Parallax (px). */
const PARALLAX_PX = 12;
/** Überstand der Ebenen, damit beim Verschieben keine Ränder sichtbar werden. */
const PAD = 24;
/** Dauer der Ritual-Sequenz und ihre Phasen (Sekunden). */
const RITUAL = { burn: 2.8, ash: 4.8, end: 7.5 } as const;

/** Horizontale Lage der Bauwerke als Anteil der Breite. */
const LAYOUT = {
  keep: 0.05,
  housesFrom: 0.17,
  housesTo: 0.45,
  market: 0.465,
  cart: 0.5,
  mill: 0.56,
  forge: 0.6,
  alchemy: 0.675,
  chapel: 0.705,
  crypt: 0.795,
  walls: 0.845,
} as const;

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
  /** Leuchtende Partikel (Funken, Seelen, Glut) landen in der additiven Ebene. */
  readonly glow?: boolean;
  readonly sway?: boolean;
}

/** Partikel plus GPU-Sprite; alle Sprites einer Ebene teilen sich eine Textur und damit einen Draw-Call. */
interface Mote extends Particle {
  readonly sprite: Sprite;
}

interface Light {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly color: number;
  /** Fenster leuchten nur nachts, Esse und Alchemie immer, Fackeln flackern. */
  readonly kind: "window" | "forge" | "torch" | "rose" | "alchemy";
  readonly seed: number;
}

export type SceneTarget = TileId | "raven" | "merchant";

export interface SceneHover {
  readonly target: SceneTarget;
  /** Ankerpunkt in Pixeln relativ zur Szene (oberer Rand des Gebäudes). */
  readonly x: number;
  readonly y: number;
}

export interface SceneCallbacks {
  readonly onSelect: (target: SceneTarget, x: number, y: number) => void;
  readonly onHover: (hover: SceneHover | null) => void;
}

interface Hotspot {
  readonly target: SceneTarget;
  readonly rect: Rectangle;
}

/**
 * Gemalte Szene von Vhal in Ebenen (Himmel, Berge, Hügel, Dorf, Vordergrund) mit Parallax,
 * Tageslicht, Jahreszeiten, Lichtquellen, Figuren, Belagerung und klickbaren Gebäuden.
 * Die Dorf-Ebene wird nur bei Modelländerungen neu gerastert und sonst als Textur gezeichnet.
 */
export class SceneRenderer {
  private readonly app = new Application();
  private readonly sky = new Graphics();
  private readonly clouds = new Graphics();
  private readonly landscape = new Container();
  private readonly far = new Graphics();
  private readonly mid = new Graphics();
  private readonly village = new Container();
  private readonly world = new Graphics();
  private readonly actors = new Graphics();
  private readonly highlight = new Graphics();
  private readonly hotspotLayer = new Container();
  private readonly foreground = new Graphics();
  private readonly lights = new Graphics();
  private readonly overlay = new Graphics();
  private readonly fx = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } });
  private readonly glow = new ParticleContainer({ dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false } });
  private readonly grading = new ColorMatrixFilter();
  private readonly gradients = new Gradients();
  private dot: Texture | null = null;
  private streak: Texture | null = null;
  private particles: Mote[] = [];
  private lightPoints: Light[] = [];
  private hotspots: Hotspot[] = [];
  private hovered: SceneTarget | null = null;
  private model: SceneModel | null = null;
  private dynamics: SceneDynamics = { battle: null };
  private animate = true;
  private time = 0;
  private lastSky = -Infinity;
  private readonly pointer = { x: 0, y: 0 };
  private readonly camera = { x: 0, y: 0 };
  private shakeTime = 0;
  private shakeAmp = 0;
  /** Laufende Ritual-Sequenz: Zeit seit Beginn und das Dorf, das verbrennt. */
  private ritual: { t: number; before: SceneModel; ruin: boolean } | null = null;
  private callbacks: SceneCallbacks | null = null;

  async init(host: HTMLElement, callbacks: SceneCallbacks): Promise<void> {
    this.callbacks = callbacks;
    await this.app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: devicePixelRatio });
    host.appendChild(this.app.canvas);

    this.village.addChild(this.world, this.actors, this.highlight, this.hotspotLayer);
    this.landscape.addChild(this.far, this.mid, this.village, this.foreground);
    this.landscape.filters = [this.grading];
    this.clouds.filters = [new BlurFilter({ strength: 6, quality: 2 })];
    this.clouds.alpha = 0.55;
    this.lights.blendMode = "add";
    this.lights.filters = [new BlurFilter({ strength: 8, quality: 3 })];
    this.glow.blendMode = "add";
    this.app.stage.addChild(this.sky, this.clouds, this.landscape, this.overlay, this.lights, this.fx, this.glow);

    this.dot = this.app.renderer.generateTexture(new Graphics().circle(DOT_RADIUS, DOT_RADIUS, DOT_RADIUS).fill(0xffffff));
    this.streak = this.app.renderer.generateTexture(new Graphics().moveTo(2, 0).lineTo(0, 9).stroke({ color: 0xffffff, width: 1 }));
    // Die statische Ebene wird nur bei Änderungen neu gerastert und sonst als eine Textur gezeichnet.
    this.world.cacheAsTexture({ resolution: devicePixelRatio, antialias: true });
    this.app.renderer.on("resize", () => this.draw());
    this.app.ticker.add((t) => this.step(t.deltaMS / 1000));

    // Parallax: Maus über der Szene bzw. Neigung des Geräts.
    host.addEventListener("pointermove", this.onPointer);
    host.addEventListener("pointerleave", this.onLeave);
    window.addEventListener("deviceorientation", this.onTilt);
  }

  private readonly onPointer = (e: PointerEvent): void => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  };

  private readonly onLeave = (): void => {
    this.pointer.x = 0;
    this.pointer.y = 0;
  };

  private readonly onTilt = (e: DeviceOrientationEvent): void => {
    if (e.gamma === null || e.beta === null) return;
    this.pointer.x = Math.max(-1, Math.min(1, e.gamma / 30));
    this.pointer.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  };

  setAnimate(animate: boolean): void {
    this.animate = animate;
    if (!animate) {
      this.clearParticles();
      this.ritual = null;
      this.shakeTime = 0;
      this.app.stage.position.set(0, 0);
      this.drawAnim();
    }
  }

  update(model: SceneModel): void {
    this.model = model;
    // Während der Ritual-Sequenz bleibt das alte Dorf stehen, bis es in Asche fällt.
    if (this.ritual && this.ritual.t < RITUAL.burn) return;
    this.draw();
  }

  setDynamics(dynamics: SceneDynamics): void {
    this.dynamics = dynamics;
  }

  /** Bildwackeln, z. B. bei Schlachtbeginn. */
  shake(amplitude: number, seconds: number): void {
    if (!this.animate) return;
    this.shakeAmp = Math.max(this.shakeAmp, amplitude);
    this.shakeTime = Math.max(this.shakeTime, seconds);
  }

  /** Startet die Zwischensequenz: Vhal brennt, Asche fällt, das Dorf erhebt sich neu. */
  playRitual(): void {
    if (!this.animate || !this.model) return;
    this.ritual = { t: 0, before: this.model, ruin: false };
    this.shake(4, 1.2);
  }

  destroy(): void {
    window.removeEventListener("deviceorientation", this.onTilt);
    this.app.canvas.parentElement?.removeEventListener("pointermove", this.onPointer);
    this.app.canvas.parentElement?.removeEventListener("pointerleave", this.onLeave);
    this.dot?.destroy(true);
    this.streak?.destroy(true);
    this.app.destroy(true, { children: true });
  }

  private get size(): { w: number; h: number; ground: number } {
    const { width: w, height: h } = this.app.screen;
    return { w, h, ground: h * 0.8 };
  }

  /** Das Modell, das gerade gezeichnet wird – während des Rituals das alte, dann die Ruine. */
  private get shown(): SceneModel | null {
    const m = this.model;
    if (!m || !this.ritual) return m;
    // Erst steht das alte Dorf noch in Flammen, dann bleibt nur die Ruine.
    if (this.ritual.t < RITUAL.burn) return this.ritual.before;
    if (this.ritual.t < RITUAL.ash) return { ...m, houses: 0, burning: true, market: false, mill: false };
    const grow = (this.ritual.t - RITUAL.ash) / (RITUAL.end - RITUAL.ash);
    return { ...m, houses: Math.round(m.houses * Math.min(1, grow)) };
  }

  // ── Statische Ebenen ────────────────────────────────────────────────────────

  private draw(): void {
    const m = this.shown;
    if (!m) return;
    this.gradients.clear();
    this.lightPoints = [];
    this.hotspots = [];
    this.drawFar(m);
    this.drawMid(m);
    const g = this.world.clear();
    this.drawGround(g, m);
    this.drawKeep(g, m);
    this.drawHouses(g, m);
    if (m.market) this.drawMarket(g, m);
    if (m.merchant) this.drawCart(g);
    if (m.forge) this.drawForge(g, m);
    if (m.alchemy) this.drawAlchemy(g, m);
    if (m.chapel) this.drawChapel(g, m);
    if (m.souls) this.drawGraveyard(g, m);
    this.drawWalls(g, m);
    this.world.updateCacheTexture();
    this.drawForeground(m);
    this.buildHotspots();
    this.drawClouds();
    this.drawAnim();
  }

  private drawFar(m: SceneModel): void {
    const { w, h } = this.size;
    const g = this.far.clear();
    const haze = (SKY[m.act - 1] ?? [0x141a2a, 0x3a2a26])[1];
    const snow = SEASON_PALETTE[m.season].snow || m.weather === "snow";
    for (let layer = 0; layer < 2; layer += 1) {
      const base = h * (0.62 - layer * 0.04);
      const color = lerpColor(0x2a2a30, haze, 0.55 - layer * 0.25);
      const pts: number[] = [-PAD, h];
      const peaks: { x: number; y: number }[] = [];
      for (let i = 0; i <= 12; i += 1) {
        const x = -PAD + ((w + PAD * 2) * i) / 12;
        const y = base - h * (0.12 + hash(i * 13 + layer * 101) * 0.22);
        pts.push(x, y);
        peaks.push({ x, y });
      }
      pts.push(w + PAD, h);
      g.poly(pts).fill(this.gradients.vertical(base - h * 0.35, base + h * 0.2, shade(color, 1.15), shade(color, 0.7)));
      // Licht auf der linken Flanke, Schnee folgt den Hängen bis zu einem Drittel herab
      for (let i = 1; i < peaks.length - 1; i += 1) {
        const a = peaks[i - 1];
        const p = peaks[i];
        const b = peaks[i + 1];
        if (!a || !p || !b || p.y > a.y || p.y > b.y) continue;
        const along = (q: { x: number; y: number }, f: number): [number, number] => [p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f];
        g.poly([p.x, p.y, ...along(a, 0.9), p.x + (b.x - p.x) * 0.1, p.y + h * 0.15]).fill({ color: 0xffffff, alpha: 0.05 });
        if (snow || layer === 0) {
          const f = snow ? 0.32 : 0.14;
          const [lx, ly] = along(a, f);
          const [rx, ry] = along(b, f);
          const jag = Math.min(ly, ry) + h * 0.012;
          g.poly([p.x, p.y, rx, ry, (p.x + rx) / 2, jag, p.x, jag + h * 0.01, (p.x + lx) / 2, jag - h * 0.004, lx, ly]).fill({ color: 0xe8ecf2, alpha: snow ? 0.85 : 0.3 });
        }
      }
    }
  }

  private drawMid(m: SceneModel): void {
    const { w, h, ground } = this.size;
    const g = this.mid.clear();
    const pal = SEASON_PALETTE[m.season];
    // Sanfte Hügel mit Feldern im Flickenmuster
    const hill = (offset: number, height: number, color: number): void => {
      const pts: number[] = [-PAD, ground];
      for (let i = 0; i <= 24; i += 1) {
        const x = -PAD + ((w + PAD * 2) * i) / 24;
        pts.push(x, ground - h * height - Math.sin(i * 0.7 + offset) * h * 0.035 - Math.sin(i * 0.23 + offset * 2) * h * 0.03);
      }
      pts.push(w + PAD, ground);
      g.poly(pts).fill(this.gradients.vertical(ground - h * (height + 0.08), ground, shade(color, 1.1), shade(color, 0.7)));
    };
    hill(1.3, 0.2, shade(pal.grassDark, 1.1));
    hill(0.2, 0.12, pal.grass);
    // Felder: schräge Streifen mit Furchen
    for (let i = 0; i < 9; i += 1) {
      const x = w * (0.18 + i * 0.07 + hash(i + 40) * 0.03);
      const fy = ground - h * (0.09 + hash(i + 50) * 0.05);
      const fw = w * (0.05 + hash(i + 60) * 0.03);
      const fh = h * 0.025;
      const color = i % 3 === 0 ? pal.grass : pal.field;
      g.poly([x, fy, x + fw, fy - fh * 0.3, x + fw * 1.05, fy + fh, x + fw * 0.05, fy + fh * 1.2]).fill(color);
      for (let r = 1; r < 4; r += 1) g.moveTo(x + (fw * r) / 4, fy - fh * 0.1).lineTo(x + (fw * r) / 4 + fw * 0.05, fy + fh).stroke({ color: pal.fieldLine, width: 0.6, alpha: 0.6 });
    }
    // Waldsaum
    for (let i = 0; i < 60; i += 1) {
      const x = -PAD + hash(i + 300) * (w + PAD * 2);
      if (x > w * 0.16 && x < w * 0.86 && hash(i + 9) > 0.35) continue;
      const base = ground - h * (0.06 + hash(i + 7) * 0.08);
      const th = h * (0.1 + hash(i + 99) * 0.08);
      if (hash(i + 5) > 0.45) conifer(g, x, base, th, shade(pal.leaves[0] ?? 0x2f4a2a, 0.75), pal.snow);
      else broadleaf(g, x, base, th, pal.leaves, pal.snow, i * 17);
    }
  }

  private drawGround(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const pal = SEASON_PALETTE[m.season];
    g.rect(-PAD, ground, w + PAD * 2, h - ground + PAD).fill(this.gradients.vertical(ground, h, pal.grass, shade(pal.grassDark, 0.7)));
    // Feldweg mit Fahrspuren und Kopfsteinen im Ort
    const road = ground + (h - ground) * 0.42;
    g.poly([-PAD, road - 3, w + PAD, road - 4, w + PAD, road + 6, -PAD, road + 7]).fill({ color: pal.snow ? 0x9a9aa2 : 0x5a4630, alpha: 0.85 });
    g.moveTo(-PAD, road - 1).lineTo(w + PAD, road - 2).stroke({ color: 0x2a2018, width: 0.8, alpha: 0.6 });
    g.moveTo(-PAD, road + 4).lineTo(w + PAD, road + 3).stroke({ color: 0x2a2018, width: 0.8, alpha: 0.6 });
    for (let x = w * LAYOUT.housesFrom, i = 0; x < w * LAYOUT.walls; x += 6 + hash(i) * 5, i += 1) {
      g.roundRect(x, road - 2 + (i % 2) * 3, 4 + hash(i + 1) * 3, 2.5, 1).fill({ color: 0x3a3028, alpha: 0.6 + hash(i + 2) * 0.3 });
    }
    // Grasbüschel
    for (let i = 0; i < 70; i += 1) {
      const x = hash(i + 500) * w;
      const y = ground + 2 + hash(i + 600) * (h - ground) * 0.9;
      if (Math.abs(y - road) < 6) continue;
      g.moveTo(x, y).lineTo(x - 1.5, y - 4).stroke({ color: shade(pal.grassDark, 1.2), width: 0.8 });
      g.moveTo(x, y).lineTo(x + 1.5, y - 3.5).stroke({ color: shade(pal.grass, 1.2), width: 0.8 });
    }
  }

  private addHotspot(target: SceneTarget, x: number, y: number, w: number, h: number): void {
    this.hotspots.push({ target, rect: new Rectangle(x, y, w, h) });
  }

  private drawKeep(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const kx = w * LAYOUT.keep;
    const kw = Math.max(40, w * 0.065);
    const top = h * 0.24;
    const depth = kw * 0.25;
    const snow = SEASON_PALETTE[m.season].snow;
    groundShadow(g, kx - kw * 0.4, ground, kw * 1.6);
    // Seitenturm (dahinter)
    const tx = kx - kw * 0.42;
    const tTop = top + h * 0.12;
    masonry(g, tx, tTop, kw * 0.42, ground - tTop, STONE_DARK, 900, h * 0.035);
    g.poly([tx - 3, tTop, tx + kw * 0.21, tTop - h * 0.14, tx + kw * 0.42 + 3, tTop]).fill(SLATE);
    g.poly([tx + kw * 0.21, tTop - h * 0.14, tx + kw * 0.42 + 3, tTop, tx + kw * 0.21, tTop]).fill(shade(SLATE, 0.7));
    // Hauptturm: Vorderseite, Seitenwand, Zinnen
    sideWall(g, kx + kw, top, ground - top, depth, STONE);
    masonry(g, kx, top, kw, ground - top, STONE, 100, h * 0.035);
    const merlon = kw / 7;
    for (let i = 0; i < 4; i += 1) {
      masonry(g, kx + i * merlon * 2, top - h * 0.05, merlon, h * 0.05, STONE, 200 + i, h * 0.025);
      if (snow) g.rect(kx + i * merlon * 2, top - h * 0.055, merlon, 2).fill(0xeef0f4);
    }
    // Schießscharten mit Licht
    for (let i = 0; i < 3; i += 1) {
      const sx = kx + kw * (0.2 + i * 0.25);
      const sy = h * 0.36 + (i % 2) * h * 0.12;
      g.rect(sx, sy, 2.5, h * 0.06).fill(0x120d0a);
      this.lightPoints.push({ x: sx + 1, y: sy + h * 0.03, r: h * 0.05, color: 0xffb35a, kind: "window", seed: i });
    }
    // Tor mit Fallgitter und Fackeln
    const gw = kw * 0.36;
    const gx = kx + kw / 2 - gw / 2;
    g.roundRect(gx - 2, ground - h * 0.17, gw + 4, h * 0.17, gw / 2).fill(shade(STONE, 0.7));
    g.roundRect(gx, ground - h * 0.155, gw, h * 0.155, gw / 2).fill(0x120d0a);
    for (let i = 1; i < 5; i += 1) g.rect(gx + (gw * i) / 5, ground - h * 0.14, 1, h * 0.14).fill({ color: 0x4a3a2a, alpha: 0.9 });
    for (let i = 1; i < 4; i += 1) g.rect(gx, ground - h * 0.14 + (h * 0.14 * i) / 4, gw, 1).fill({ color: 0x4a3a2a, alpha: 0.9 });
    for (const side of [-1, 1]) {
      const fx = kx + kw / 2 + side * (gw / 2 + 4);
      g.rect(fx - 0.8, ground - h * 0.12, 1.6, h * 0.05).fill(TIMBER);
      this.lightPoints.push({ x: fx, y: ground - h * 0.125, r: h * 0.09, color: 0xff9a3a, kind: "torch", seed: side + 5 });
    }
    // Fahnenmast
    g.rect(kx + kw / 2 - 1, top - h * 0.22, 2, h * 0.17).fill(0x2a2018);
    if (m.burning) g.rect(kx, top, kw, (ground - top) * 0.4).fill({ color: 0x000000, alpha: 0.4 });
    this.addHotspot("keep", tx - 2, top - h * 0.06, kw * 1.42 + depth + 4, ground - top + h * 0.06);
  }

  private drawHouses(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const left = w * LAYOUT.housesFrom;
    const span = w * (LAYOUT.housesTo - LAYOUT.housesFrom);
    const snow = SEASON_PALETTE[m.season].snow;
    // Hintere Reihe zuerst, damit die vordere sie überdeckt
    const order = Array.from({ length: m.houses }, (_, i) => i).sort((a, b) => (b % 3 === 1 ? 1 : 0) - (a % 3 === 1 ? 1 : 0));
    let minX = Infinity;
    let maxX = -Infinity;
    for (const i of order) {
      const back = i % 3 === 1;
      const x = left + (i / MAX_HOUSES) * span + (back ? span / MAX_HOUSES / 2 : 0);
      const scale = back ? 0.78 : 1;
      const hw = w * (0.017 + hash(i) * 0.008) * scale;
      const hh = h * (0.08 + hash(i + 3) * 0.05) * scale;
      const base = ground - (back ? h * 0.03 : 0);
      const depth = hw * 0.35;
      const plaster = lerpColor(PLASTER, 0xa89270, hash(i + 13));
      if (!back) groundShadow(g, x, base, hw + depth);
      sideWall(g, x + hw, base - hh, hh, depth, m.burning ? 0x2e231c : plaster);
      halfTimber(g, x, base - hh, hw, hh, plaster, m.burning);
      const roofH = hh * (0.6 + hash(i + 5) * 0.35);
      gableRoof(g, x, base - hh, hw, roofH, depth, lerpColor(THATCH, 0x6e5230, hash(i + 21)), { snow, burnt: m.burning, seed: i * 9 });
      // Schornstein
      if (hash(i + 11) > 0.5) masonry(g, x + hw * 0.66, base - hh - roofH * 0.75, hw * 0.16, roofH * 0.5, STONE_DARK, 400 + i, 3);
      // Tür und Fenster
      g.rect(x + hw * 0.4, base - hh * 0.4, hw * 0.22, hh * 0.4).fill(shade(TIMBER, 0.8));
      if (!m.burning) {
        windowPane(g, x + hw * 0.14, base - hh * 0.82, hw * 0.2, hh * 0.18, false);
        windowPane(g, x + hw * 0.62, base - hh * 0.82, hw * 0.2, hh * 0.18, false);
        if (i % 3 !== 1) this.lightPoints.push({ x: x + hw * 0.24, y: base - hh * 0.73, r: hw * 0.9, color: 0xf3b866, kind: "window", seed: i });
      }
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + hw + depth);
    }
    if (m.houses > 0) this.addHotspot("keep", minX, ground - h * 0.25, maxX - minX, h * 0.25);
  }

  private drawMarket(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const colors = [0x8a2a22, 0x2f4a6a, 0x7a6a22];
    const snow = SEASON_PALETTE[m.season].snow;
    for (let i = 0; i < 3; i += 1) {
      const x = w * (LAYOUT.market + i * 0.02);
      const sw = w * 0.017;
      const top = ground - h * 0.09;
      groundShadow(g, x, ground, sw);
      g.rect(x, top, 1.5, h * 0.09).fill(TIMBER);
      g.rect(x + sw, top, 1.5, h * 0.09).fill(TIMBER);
      // Gestreifte Markise
      const c = colors[i] ?? 0x8a2a22;
      for (let s = 0; s < 4; s += 1) {
        g.poly([x - 2 + ((sw + 5) * s) / 4, top, x + sw / 2, top - h * 0.04, x - 2 + ((sw + 5) * (s + 1)) / 4, top]).fill(s % 2 ? shade(c, 1.35) : c);
      }
      if (snow) g.poly([x - 2, top - 1, x + sw / 2, top - h * 0.04, x + sw + 3, top - 1]).fill({ color: 0xeef0f4, alpha: 0.7 });
      // Theke mit Waren
      g.rect(x + 1, ground - h * 0.035, sw, h * 0.035).fill(0x5a3e28);
      for (let k = 0; k < 3; k += 1) g.circle(x + 3 + k * (sw / 3), ground - h * 0.04, 1.6).fill([0xc84a2a, 0xd8b04a, 0x6a8a3a][k] ?? 0xc84a2a);
    }
    this.addHotspot("keep", w * LAYOUT.market - 3, ground - h * 0.14, w * 0.065, h * 0.14);
  }

  private drawCart(g: Graphics): void {
    const { w, h, ground } = this.size;
    const x = w * LAYOUT.cart;
    const cw = w * 0.04;
    const y = ground + (h - ground) * 0.35;
    groundShadow(g, x, y, cw * 1.6);
    // Plane, Kasten, Räder
    g.roundRect(x, y - h * 0.09, cw, h * 0.06, cw * 0.3).fill(0xd6c7a1);
    g.roundRect(x, y - h * 0.09, cw, h * 0.06, cw * 0.3).stroke({ color: 0x8a7a5a, width: 0.8 });
    g.rect(x - 1, y - h * 0.035, cw + 2, h * 0.025).fill(0x5a3e28);
    for (const wx of [x + cw * 0.2, x + cw * 0.8]) {
      g.circle(wx, y - h * 0.008, h * 0.018).fill(0x2a1c12);
      g.circle(wx, y - h * 0.008, h * 0.012).stroke({ color: 0x6a4a2a, width: 1 });
    }
    // Pferd
    const hx = x + cw + 3;
    g.ellipse(hx + cw * 0.3, y - h * 0.04, cw * 0.32, h * 0.018).fill(0x4a3022);
    g.rect(hx + cw * 0.08, y - h * 0.03, 1.6, h * 0.03).fill(0x3a2418);
    g.rect(hx + cw * 0.5, y - h * 0.03, 1.6, h * 0.03).fill(0x3a2418);
    g.poly([hx + cw * 0.55, y - h * 0.05, hx + cw * 0.72, y - h * 0.08, hx + cw * 0.78, y - h * 0.07, hx + cw * 0.62, y - h * 0.035]).fill(0x4a3022);
    this.addHotspot("merchant", x - 2, y - h * 0.1, cw * 2.2, h * 0.11);
  }

  private drawForge(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const fx = w * LAYOUT.forge;
    const fw = w * 0.045;
    const fh = h * 0.13;
    const depth = fw * 0.3;
    const snow = SEASON_PALETTE[m.season].snow;
    groundShadow(g, fx, ground, fw + depth);
    sideWall(g, fx + fw, ground - fh, fh, depth, STONE);
    masonry(g, fx, ground - fh, fw, fh, STONE, 600, 4);
    gableRoof(g, fx, ground - fh, fw, h * 0.07, depth, SLATE, { slate: true, snow, burnt: m.burning, seed: 61 });
    masonry(g, fx + fw * 0.7, ground - h * 0.27, fw * 0.2, h * 0.1, STONE_DARK, 700, 3);
    // Offene Esse
    const door = this.gradients.vertical(ground - h * 0.075, ground, 0x4a1406, m.forging ? 0xff8a3a : 0xb0502a);
    g.roundRect(fx + fw * 0.28, ground - h * 0.075, fw * 0.44, h * 0.075, 3).fill(door);
    // Amboss davor
    g.poly([fx - fw * 0.25, ground - h * 0.03, fx + fw * 0.05, ground - h * 0.03, fx, ground - h * 0.02, fx - fw * 0.2, ground - h * 0.02]).fill(0x2a2a2e);
    g.rect(fx - fw * 0.15, ground - h * 0.02, fw * 0.1, h * 0.02).fill(0x2a2a2e);
    this.lightPoints.push({ x: fx + fw * 0.5, y: ground - h * 0.04, r: h * 0.14, color: 0xff7a2a, kind: "forge", seed: 7 });
    this.addHotspot("forge", fx - fw * 0.3, ground - h * 0.28, fw * 1.6 + depth, h * 0.28);
  }

  private drawAlchemy(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const ax = w * LAYOUT.alchemy;
    const aw = w * 0.018;
    const top = ground - h * 0.33;
    groundShadow(g, ax, ground, aw * 1.5);
    sideWall(g, ax + aw, top, ground - top, aw * 0.3, STONE_DARK);
    masonry(g, ax, top, aw, ground - top, STONE_DARK, 800, 4);
    g.poly([ax - 3, top, ax + aw / 2, top - h * 0.1, ax + aw + 3, top]).fill(0x2a3a3a);
    g.poly([ax + aw / 2, top - h * 0.1, ax + aw + 3, top, ax + aw / 2, top]).fill(0x1c2828);
    // Grünes Licht im Fenster
    g.roundRect(ax + aw * 0.3, top + h * 0.05, aw * 0.4, h * 0.05, 2).fill(m.burning ? 0x1a140f : 0x7af0a0);
    this.lightPoints.push({ x: ax + aw / 2, y: top + h * 0.075, r: h * 0.08, color: 0x4adf7a, kind: "alchemy", seed: 9 });
    this.addHotspot("alchemy", ax - 4, top - h * 0.1, aw + 10, ground - top + h * 0.1);
  }

  private drawChapel(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const cx = w * LAYOUT.chapel;
    const cw = w * 0.06;
    const ch = h * 0.18;
    const depth = cw * 0.3;
    const snow = SEASON_PALETTE[m.season].snow;
    groundShadow(g, cx, ground, cw + depth);
    sideWall(g, cx + cw, ground - ch, ch, depth, STONE);
    masonry(g, cx, ground - ch, cw, ch, lerpColor(STONE, 0x8a7e6a, 0.3), 1000, 4);
    gableRoof(g, cx, ground - ch, cw, h * 0.11, depth, SLATE, { slate: true, snow, burnt: m.burning, seed: 71 });
    // Rosettenfenster
    const rx = cx + cw / 2;
    const ry = ground - h * 0.11;
    const rr = h * 0.03;
    g.circle(rx, ry, rr + 1.5).fill(shade(STONE, 0.7));
    g.circle(rx, ry, rr).fill(m.ending === "ash" ? 0x4a2a5a : 0x8a3a2a);
    for (let a = 0; a < 8; a += 1) {
      g.moveTo(rx, ry).lineTo(rx + Math.cos((a * Math.PI) / 4) * rr, ry + Math.sin((a * Math.PI) / 4) * rr).stroke({ color: 0x1a1410, width: 0.8 });
    }
    this.lightPoints.push({ x: rx, y: ry, r: h * 0.08, color: m.ending === "ash" ? 0xb06ad0 : 0xf0a060, kind: "rose", seed: 11 });
    // Portal
    g.roundRect(cx + cw * 0.4, ground - h * 0.06, cw * 0.2, h * 0.06, cw * 0.1).fill(0x1a120c);
    // Glockenturm mit spitzem Helm und Kreuz
    const tx = cx + cw + depth * 0.2;
    const tw = cw * 0.32;
    const towerTop = m.tower ? ground - h * 0.42 : ground - h * 0.26;
    sideWall(g, tx + tw, towerTop, ground - towerTop, tw * 0.3, STONE);
    masonry(g, tx, towerTop, tw, ground - towerTop, STONE, 1100, 4);
    g.poly([tx - 2, towerTop, tx + tw / 2, towerTop - h * 0.14, tx + tw + 2, towerTop]).fill(SLATE);
    g.poly([tx + tw / 2, towerTop - h * 0.14, tx + tw + 2, towerTop, tx + tw / 2, towerTop]).fill(shade(SLATE, 0.65));
    g.roundRect(tx + tw * 0.28, towerTop + h * 0.03, tw * 0.44, h * 0.055, tw * 0.2).fill(0x120d0a);
    g.circle(tx + tw / 2, towerTop + h * 0.06, tw * 0.13).fill(0xb08a3a);
    g.rect(tx + tw / 2 - 1, towerTop - h * 0.2, 2, h * 0.07).fill(0xd4a54a);
    g.rect(tx + tw / 2 - 4, towerTop - h * 0.18, 8, 2).fill(0xd4a54a);
    this.addHotspot("chapel", cx - 4, towerTop - h * 0.2, cw + depth + tw + 10, ground - towerTop + h * 0.2);
  }

  private drawGraveyard(g: Graphics, m: SceneModel): void {
    const { w, h, ground } = this.size;
    const gx = w * LAYOUT.crypt;
    const snow = SEASON_PALETTE[m.season].snow;
    // Gruft mit Säulen
    const mw = w * 0.022;
    masonry(g, gx, ground - h * 0.07, mw, h * 0.07, STONE_DARK, 1200, 3);
    g.poly([gx - 2, ground - h * 0.07, gx + mw / 2, ground - h * 0.1, gx + mw + 2, ground - h * 0.07]).fill(shade(STONE_DARK, 0.8));
    g.rect(gx + mw * 0.35, ground - h * 0.05, mw * 0.3, h * 0.05).fill(0x0a0808);
    // Kreuze und Grabsteine
    for (let i = 0; i < 6; i += 1) {
      const x = gx + mw + 4 + i * w * 0.007;
      const y = ground + 1 - (i % 2) * 2;
      if (i % 3 === 0) {
        g.rect(x, y - h * 0.035, 1.5, h * 0.035).fill(STONE);
        g.rect(x - 2, y - h * 0.027, 5.5, 1.5).fill(STONE);
      } else {
        g.roundRect(x - 1.5, y - h * 0.025, 4.5, h * 0.025, 2).fill(STONE_DARK);
        if (snow) g.rect(x - 1.5, y - h * 0.026, 4.5, 1.2).fill(0xeef0f4);
      }
    }
    this.addHotspot("crypt", gx - 3, ground - h * 0.11, mw + w * 0.05, h * 0.12);
  }

  private drawWalls(g: Graphics, m: SceneModel): void {
    if (m.walls === 0 && !m.warroom) return;
    const { w, h, ground } = this.size;
    const wx = w * LAYOUT.walls;
    const ww = w * 0.04;
    const height = h * (0.08 + m.walls * 0.012);
    const snow = SEASON_PALETTE[m.season].snow;
    if (m.walls > 0) {
      sideWall(g, wx + ww, ground - height, height, ww * 0.25, STONE);
      masonry(g, wx, ground - height, ww, height, STONE, 1300, 4);
      const merlon = ww / 7;
      for (let i = 0; i < 4; i += 1) {
        g.rect(wx + i * merlon * 2, ground - height - h * 0.025, merlon, h * 0.025).fill(STONE);
        if (snow) g.rect(wx + i * merlon * 2, ground - height - h * 0.027, merlon, 1.5).fill(0xeef0f4);
      }
      // Palisaden davor für weitere Befestigungen
      for (let i = 0; i < m.walls; i += 1) {
        const x = wx + ww + 6 + i * 4;
        const ph = height * (0.55 + hash(i) * 0.15);
        g.poly([x, ground, x, ground - ph, x + 1.75, ground - ph - 4, x + 3.5, ground - ph, x + 3.5, ground]).fill(i % 2 ? 0x5a4028 : 0x6a4a2e);
      }
      this.lightPoints.push({ x: wx + ww / 2, y: ground - height - h * 0.03, r: h * 0.08, color: 0xff9a3a, kind: "torch", seed: 13 });
    } else {
      // Kriegsratszelt, solange es noch keine Mauer gibt
      g.poly([wx, ground, wx + ww / 2, ground - h * 0.1, wx + ww, ground]).fill(0x8a2a22);
      g.poly([wx + ww / 2, ground - h * 0.1, wx + ww, ground, wx + ww * 0.6, ground]).fill(0x5a1a16);
    }
    this.addHotspot("warroom", wx - 2, ground - height - h * 0.04, ww * 1.3 + m.walls * 4 + 8, height + h * 0.04);
  }

  private drawForeground(m: SceneModel): void {
    const { w, h } = this.size;
    const g = this.foreground.clear();
    const pal = SEASON_PALETTE[m.season];
    const dark = shade(pal.grassDark, 0.45);
    // Dunkle Grashalme und Steine am unteren Rand rahmen das Bild
    for (let i = 0; i < 50; i += 1) {
      const x = -PAD + hash(i + 900) * (w + PAD * 2);
      const len = h * (0.04 + hash(i + 901) * 0.06);
      g.moveTo(x, h + 2).quadraticCurveTo(x + (hash(i + 902) - 0.5) * 8, h - len * 0.6, x + (hash(i + 903) - 0.5) * 10, h - len).stroke({ color: dark, width: 1.4 });
    }
    for (let i = 0; i < 4; i += 1) {
      const x = hash(i + 950) * w;
      g.ellipse(x, h + 2, w * 0.02, h * 0.035).fill(shade(STONE_DARK, 0.5));
    }
    // Zaun links vorn
    for (let i = 0; i < 5; i += 1) g.rect(w * 0.01 + i * w * 0.012, h * 0.9, 2, h * 0.1).fill(shade(TIMBER, 0.7));
    g.rect(w * 0.005, h * 0.93, w * 0.06, 1.5).fill(shade(TIMBER, 0.7));
  }

  private drawClouds(): void {
    const { w, h } = this.size;
    const g = this.clouds.clear();
    // Zwei Bahnen nebeneinander, damit das Wandern nahtlos umlaufen kann.
    for (let copy = 0; copy < 2; copy += 1) {
      for (let i = 0; i < 6; i += 1) {
        const x = copy * w + hash(i + 70) * w;
        const y = h * (0.08 + hash(i + 71) * 0.22);
        for (let k = 0; k < 4; k += 1) g.ellipse(x + k * w * 0.025, y + (k % 2) * 3, w * 0.035, h * 0.04).fill({ color: 0xcfc8bc, alpha: 0.5 });
      }
    }
  }

  private buildHotspots(): void {
    for (const child of this.hotspotLayer.removeChildren()) child.destroy();
    for (const spot of this.hotspots) {
      const hit = new Container();
      hit.eventMode = "static";
      hit.cursor = "pointer";
      hit.hitArea = spot.rect;
      hit.on("pointerover", () => this.hover(spot));
      hit.on("pointerout", () => this.hover(null));
      hit.on("pointertap", () => {
        const p = this.toScene(spot.rect.x + spot.rect.width / 2, spot.rect.y);
        this.callbacks?.onSelect(spot.target, p.x, p.y);
      });
      this.hotspotLayer.addChild(hit);
    }
    // Der Rabe sitzt auf dem Burgfried und hat einen eigenen Klickbereich.
    if (this.model?.raven) {
      const { w, h } = this.size;
      const hit = new Container();
      hit.eventMode = "static";
      hit.cursor = "pointer";
      hit.hitArea = new Rectangle(w * LAYOUT.keep - 4, h * 0.24 - h * 0.13, 26, h * 0.1);
      const spot: Hotspot = { target: "raven", rect: hit.hitArea as Rectangle };
      hit.on("pointerover", () => this.hover(spot));
      hit.on("pointerout", () => this.hover(null));
      hit.on("pointertap", () => {
        const p = this.toScene(spot.rect.x + spot.rect.width / 2, spot.rect.y);
        this.callbacks?.onSelect("raven", p.x, p.y);
      });
      this.hotspotLayer.addChild(hit);
    }
    this.hover(null);
  }

  /** Dorfkoordinaten → Szenenkoordinaten (berücksichtigt Parallax und Wackeln). */
  private toScene(x: number, y: number): { x: number; y: number } {
    return { x: x + this.village.x + this.landscape.x + this.app.stage.x, y: y + this.village.y + this.app.stage.y };
  }

  private hover(spot: Hotspot | null): void {
    this.hovered = spot?.target ?? null;
    const g = this.highlight.clear();
    if (!spot) {
      this.callbacks?.onHover(null);
      return;
    }
    const r = spot.rect;
    g.roundRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4, 6).fill({ color: 0xffe0a0, alpha: 0.07 });
    g.roundRect(r.x - 2, r.y - 2, r.width + 4, r.height + 4, 6).stroke({ color: 0xe0b45c, width: 1.5, alpha: 0.85 });
    const p = this.toScene(r.x + r.width / 2, r.y);
    this.callbacks?.onHover({ target: spot.target, x: p.x, y: p.y });
  }

  // ── Bewegte Ebenen ──────────────────────────────────────────────────────────

  /** 0 = Mitternacht, 0,5 = Mittag. Ohne Animation bleibt es Nacht. */
  private get phase(): number {
    return this.animate ? (this.time / DAY_SECONDS + 0.75) % 1 : 0;
  }

  /** 1 = tiefe Nacht, 0 = heller Tag; Wetter und späte Akte dämpfen das Tageslicht. */
  private night(m: SceneModel): number {
    const daylight = (1 - Math.cos(this.phase * Math.PI * 2)) / 2;
    const cap = m.weather === "clear" ? 1 - (m.act - 1) * 0.1 : 0.45;
    return 1 - daylight * Math.max(0.2, cap);
  }

  private drawSky(m: SceneModel): void {
    const { w, h } = this.size;
    const g = this.sky.clear();
    const night = this.night(m);
    const [nTop, nBottom] = m.ending === "light" ? [0x2a3346, 0x8a6a42] : (SKY[m.act - 1] ?? [0x141a2a, 0x3a2a26]);
    const step = Math.round((1 - night) * 32) / 32;
    g.rect(0, 0, w, h).fill(this.gradients.vertical(0, h * 0.8, lerpColor(nTop, DAY_SKY[0], step), lerpColor(nBottom, DAY_SKY[1], step)));
    // Sterne – nur bei Nacht und klarem Himmel
    const starAlpha = m.weather === "clear" ? Math.max(0, night - 0.35) / 0.65 : 0;
    for (let i = 0; starAlpha > 0 && i < 50; i += 1) {
      const twinkle = 0.35 + 0.35 * Math.sin(this.time * (0.8 + hash(i) * 2) + i);
      g.circle(hash(i + 200) * w, hash(i + 300) * h * 0.5, hash(i + 400) > 0.85 ? 1.3 : 0.7).fill({ color: 0xffffff, alpha: twinkle * starAlpha * 0.8 });
    }
    // Sonne und Mond auf gegenüberliegenden Bahnen
    const arc = (offset: number): { x: number; y: number; up: number } => {
      const a = (this.phase + offset) * Math.PI * 2;
      return { x: w * (0.5 - Math.sin(a) * 0.42), y: h * (0.62 + Math.cos(a) * 0.5), up: -Math.cos(a) };
    };
    const r = h * 0.07;
    const moon = arc(0);
    if (moon.up > -0.2) {
      const red = m.act >= 5 && m.ending !== "light";
      for (let i = 5; i >= 1; i -= 1) g.circle(moon.x, moon.y, r * (1 + i * 0.4)).fill({ color: red ? 0xa3302a : 0xd8cfb8, alpha: 0.035 });
      g.circle(moon.x, moon.y, r).fill(red ? 0xb8402f : 0xe2d9c2);
      g.circle(moon.x - r * 0.3, moon.y - r * 0.2, r * 0.2).fill({ color: 0x000000, alpha: 0.08 });
      g.circle(moon.x + r * 0.25, moon.y + r * 0.3, r * 0.13).fill({ color: 0x000000, alpha: 0.06 });
    }
    const sun = arc(0.5);
    if (sun.up > -0.2 && m.weather === "clear") {
      for (let i = 6; i >= 1; i -= 1) g.circle(sun.x, sun.y, r * (1 + i * 0.55)).fill({ color: 0xffd98a, alpha: 0.045 });
      g.circle(sun.x, sun.y, r * 0.9).fill(0xffe6a8);
    }
    // Farbkorrektur der Landschaft: nachts dunkler, kühler und entsättigt; im Winter blasser.
    const f = this.grading;
    f.reset();
    f.brightness(1 - night * 0.55, false);
    f.saturate(-night * 0.35 - (SEASON_PALETTE[m.season].snow ? 0.15 : 0), true);
    f.tint(lerpColor(0xffffff, 0x8aa0d0, night * 0.6), true);
  }

  private drawAnim(): void {
    const m = this.shown;
    if (!m) return;
    const { w, h } = this.size;
    if (this.time - this.lastSky >= SKY_INTERVAL || !this.animate) {
      this.lastSky = this.time;
      this.drawSky(m);
    }
    const g = this.actors.clear();
    const t = this.animate ? this.time : 0;
    // Banner am Burgfried
    const kx = w * LAYOUT.keep + Math.max(40, w * 0.065) / 2;
    banner(g, kx + 1, h * 0.03, h * 0.16, h * 0.08, t, m.ending === "ash" ? 0x3a3a40 : 0x8a2a22);
    if (m.raven) this.drawRaven(g, m, t);
    if (m.mill) this.drawMill(g, m, t);
    this.drawPeople(g, m, t);
    this.drawSiege(g, m, t);
    this.drawLights(m, t);
    this.drawOverlay(m);
  }

  private drawRaven(g: Graphics, m: SceneModel, t: number): void {
    const { w, h } = this.size;
    const x = w * LAYOUT.keep + 8;
    const y = h * 0.24 - h * 0.05;
    const bob = Math.sin(t * 2.3) * 0.8;
    const hop = this.hovered === "raven" ? Math.abs(Math.sin(t * 9)) * 2 : 0;
    const by = y + bob - hop;
    g.ellipse(x, by, 5, 3.4).fill(0x101014);
    g.circle(x + 4, by - 3, 2.4).fill(0x101014);
    g.poly([x + 6, by - 3.4, x + 9.5, by - 2.6, x + 6, by - 2]).fill(0x2a2a30);
    g.poly([x - 4, by - 1, x - 9, by + 1.5, x - 4, by + 1.5]).fill(0x101014);
    g.circle(x + 4.6, by - 3.6, 0.6).fill(m.ravenGift ? 0xffe08a : 0xc8c8d0);
    g.moveTo(x - 1, by + 3).lineTo(x - 1.5, by + 5.5).stroke({ color: 0x2a2a30, width: 0.8 });
    g.moveTo(x + 1.5, by + 3).lineTo(x + 1.5, by + 5.5).stroke({ color: 0x2a2a30, width: 0.8 });
    if (m.ravenGift) {
      const s = 2 + Math.sin(t * 5) * 1;
      g.star(x + 9, by - 7, 4, s, s * 0.4).fill({ color: 0xffe08a, alpha: 0.9 });
    }
  }

  private drawMill(g: Graphics, m: SceneModel, t: number): void {
    const { w, h, ground } = this.size;
    const mx = w * LAYOUT.mill;
    const my = ground - h * 0.2;
    g.poly([mx - 8, ground, mx - 5, my, mx + 5, my, mx + 8, ground]).fill(PLASTER);
    g.poly([mx + 5, my, mx + 8, ground, mx + 3, ground]).fill(shade(PLASTER, 0.65));
    g.poly([mx - 7, my, mx, my - 9, mx + 7, my]).fill(m.burning ? 0x2a1a12 : THATCH);
    g.rect(mx - 1.5, ground - h * 0.05, 3, h * 0.05).fill(TIMBER);
    for (let b = 0; b < 4; b += 1) {
      const a = t * 0.8 + (b * Math.PI) / 2;
      const len = h * 0.14;
      const ex = mx + Math.cos(a) * len;
      const ey = my + Math.sin(a) * len;
      g.moveTo(mx, my).lineTo(ex, ey).stroke({ color: TIMBER, width: 2 });
      g.poly([mx + Math.cos(a) * len * 0.3, my + Math.sin(a) * len * 0.3, ex, ey, ex + Math.cos(a + 0.35) * 6, ey + Math.sin(a + 0.35) * 6, mx + Math.cos(a + 0.12) * len * 0.3, my + Math.sin(a + 0.12) * len * 0.3]).fill({ color: 0xd8ccb0, alpha: 0.9 });
    }
    g.circle(mx, my, 2).fill(0x2a1e14);
  }

  /** Kleine Gestalt mit Gehbewegung; `tool` bestimmt, was sie trägt. */
  private person(
    g: Graphics,
    x: number,
    feet: number,
    size: number,
    tunic: number,
    walk: number,
    facing: 1 | -1,
    opts: { readonly tool?: "hoe" | "spear"; readonly helmet?: boolean; readonly bound?: boolean; readonly pale?: boolean } = {},
  ): void {
    const legSwing = Math.sin(walk) * size * 0.12;
    const hip = feet - size * 0.42;
    const skin = opts.pale ? 0xc8ccc0 : 0xd2a47a;
    g.moveTo(x, hip).lineTo(x - legSwing, feet).stroke({ color: 0x2a2018, width: Math.max(1, size * 0.09) });
    g.moveTo(x, hip).lineTo(x + legSwing, feet).stroke({ color: 0x2a2018, width: Math.max(1, size * 0.09) });
    g.poly([x - size * 0.16, hip + size * 0.05, x - size * 0.12, feet - size * 0.88, x + size * 0.12, feet - size * 0.88, x + size * 0.16, hip + size * 0.05]).fill(tunic);
    g.poly([x + size * 0.02, feet - size * 0.88, x + size * 0.12, feet - size * 0.88, x + size * 0.16, hip + size * 0.05, x + size * 0.04, hip + size * 0.05]).fill(shade(tunic, 0.7));
    const headY = feet - size * 0.98;
    g.circle(x, headY, size * 0.11).fill(skin);
    if (opts.helmet) g.poly([x - size * 0.13, headY, x, headY - size * 0.17, x + size * 0.13, headY]).fill(0x7a7a80);
    const armY = feet - size * 0.78;
    if (opts.bound) {
      g.moveTo(x - size * 0.1, armY).lineTo(x + size * 0.02 * facing, hip).stroke({ color: tunic, width: Math.max(1, size * 0.08) });
      g.circle(x + size * 0.02 * facing, hip, size * 0.04).fill(0x6a6a6a);
    } else {
      g.moveTo(x, armY).lineTo(x + facing * size * 0.18 + legSwing * 0.5, hip - size * 0.04).stroke({ color: tunic, width: Math.max(1, size * 0.08) });
    }
    if (opts.tool === "hoe") {
      const hx = x + facing * size * 0.2;
      g.moveTo(hx, hip - size * 0.15).lineTo(hx + facing * size * 0.15, feet).stroke({ color: TIMBER, width: 1 });
      g.moveTo(hx + facing * size * 0.15, feet).lineTo(hx + facing * size * 0.28, feet - size * 0.05).stroke({ color: 0x6a6a70, width: 1.4 });
    } else if (opts.tool === "spear") {
      const sx = x + facing * size * 0.2;
      g.moveTo(sx, feet).lineTo(sx, feet - size * 1.35).stroke({ color: TIMBER, width: 1 });
      g.poly([sx - 1.5, feet - size * 1.35, sx, feet - size * 1.5, sx + 1.5, feet - size * 1.35]).fill(0xb0b0b8);
    }
  }

  private drawPeople(g: Graphics, m: SceneModel, t: number): void {
    const { w, h, ground } = this.size;
    const size = h * 0.075;
    const road = ground + (h - ground) * 0.42;
    // Bauern arbeiten vor ihren Häusern: gehen ein Stück, bleiben stehen und hacken.
    for (let i = 0; i < m.peasants; i += 1) {
      const home = w * (LAYOUT.housesFrom + 0.02 + i * 0.04);
      const cycle = t * 0.25 + i * 1.7;
      const pos = Math.sin(cycle);
      const moving = Math.abs(Math.cos(cycle)) > 0.35;
      const x = home + pos * w * 0.02;
      const facing: 1 | -1 = Math.cos(cycle) >= 0 ? 1 : -1;
      const walk = moving ? t * 8 + i : Math.sin(t * 5 + i) * 0.6;
      this.person(g, x, road + 6 + (i % 2) * 3, size, [0x6a4a2a, 0x5a5a3a, 0x7a5a3a][i % 3] ?? 0x6a4a2a, walk, facing, { tool: "hoe" });
    }
    // Soldaten marschieren in Reihe zwischen Burgtor und Mauer.
    const gate = w * (LAYOUT.keep + 0.035);
    const wall = w * (LAYOUT.walls - 0.01);
    for (let i = 0; i < m.soldiers; i += 1) {
      const s = ((t * 0.035 + 0) % 2 + 2) % 2;
      const along = s < 1 ? s : 2 - s;
      const facing: 1 | -1 = s < 1 ? 1 : -1;
      const x = gate + (wall - gate) * along - facing * i * size * 0.45;
      this.person(g, x, road - 1, size, 0x8a2a22, t * 9 + i * 0.5, facing, { tool: "spear", helmet: true });
    }
    // Gefangene werden von einer Wache zum Burgfried gebracht.
    if (m.prisoners > 0) {
      const s = (t * 0.03 + 0.5) % 1;
      const x = wall - (wall - gate) * s;
      this.person(g, x - size * 0.5, road + 10, size, 0x5a5a62, t * 8, -1, { tool: "spear", helmet: true });
      for (let i = 0; i < m.prisoners; i += 1) this.person(g, x + (i + 1) * size * 0.45, road + 10, size * 0.95, 0x6a6258, t * 8 + i, -1, { bound: true });
    }
  }

  private drawSiege(g: Graphics, m: SceneModel, t: number): void {
    if (m.dead === 0) return;
    const { w, h, ground } = this.size;
    const size = h * 0.075;
    const wall = w * (LAYOUT.walls + 0.05) + m.walls * 4;
    const count = Math.min(14, Math.ceil(m.dead / 3));
    const battle = this.dynamics.battle;
    for (let i = 0; i < count; i += 1) {
      const row = i % 3;
      const camp = w * (0.93 + (i / count) * 0.06);
      let x = camp;
      let walk = Math.sin(t * 1.5 + i) * 0.3;
      if (battle !== null) {
        // Angriffswelle: anrücken (erste 25 %), dann am Wall kämpfen
        const approach = Math.min(1, battle / 0.25);
        x = camp + (wall + i * size * 0.35 - camp) * approach;
        walk = approach < 1 ? t * 7 + i : Math.sin(t * 10 + i) * 1.2;
      }
      this.person(g, x, ground + 2 + row * 4, size, 0x3a3a40, walk, -1, { tool: "spear", pale: true });
    }
    if (battle === null) return;
    // Schaden an der Mauer wächst mit der Dauer der Schlacht.
    const wx = w * LAYOUT.walls;
    const ww = w * 0.04;
    const height = h * (0.08 + m.walls * 0.012);
    for (let c = 0; c < Math.floor(battle * 6); c += 1) {
      const cx = wx + hash(c + 1400) * ww;
      const cy = ground - hash(c + 1401) * height;
      g.moveTo(cx, cy).lineTo(cx + 3, cy + 4).lineTo(cx + 1, cy + 8).stroke({ color: 0x120d0a, width: 1, alpha: 0.85 });
    }
    if (battle > 0.5) g.ellipse(wx + ww * 1.2, ground, ww * 0.4, 3).fill({ color: STONE_DARK, alpha: 0.9 });
    // Pfeile von der Mauer
    if (this.animate && Math.random() < 0.35) {
      this.emit({ x: wx + ww * 0.5, y: ground - height, vx: 120 + Math.random() * 60, vy: -40 - Math.random() * 30, life: 0.7, color: 0xd0c0a0, size: 1, grow: 0, streak: true });
    }
  }

  private drawLights(m: SceneModel, t: number): void {
    const g = this.lights.clear();
    this.lights.position.copyFrom(this.village.position);
    this.lights.x += this.landscape.x;
    const night = this.night(m);
    for (const l of this.lightPoints) {
      const flicker = l.kind === "torch" || l.kind === "forge" ? 0.75 + 0.25 * Math.sin(t * 13 + l.seed * 3) * Math.sin(t * 7.3 + l.seed) : 1;
      let alpha: number;
      switch (l.kind) {
        case "forge":
          alpha = (m.forging ? 0.55 : 0.3) + night * 0.3;
          break;
        case "alchemy":
          alpha = 0.25 + night * 0.4;
          break;
        case "window":
          alpha = m.burning ? 0 : Math.max(0, night - 0.25) * (0.5 + 0.2 * Math.sin(t * 0.7 + l.seed));
          break;
        default:
          alpha = Math.max(0.1, night) * 0.7;
      }
      if (alpha <= 0.01) continue;
      g.circle(l.x, l.y, l.r * flicker).fill({ color: l.color, alpha: alpha * 0.35 });
      g.circle(l.x, l.y, l.r * 0.45 * flicker).fill({ color: l.color, alpha: alpha * 0.6 });
    }
    // Brennendes Vhal leuchtet über dem ganzen Dorf
    if (m.burning || (this.ritual && this.ritual.t < RITUAL.ash)) {
      const { w, h, ground } = this.size;
      for (let i = 0; i < 6; i += 1) {
        const x = w * (LAYOUT.housesFrom + i * 0.05);
        g.circle(x, ground - h * 0.08, h * (0.12 + 0.03 * Math.sin(t * 6 + i))).fill({ color: 0xff6a2a, alpha: 0.18 });
      }
    }
  }

  private drawOverlay(m: SceneModel): void {
    const { w, h } = this.size;
    const g = this.overlay.clear();
    if (m.weather !== "clear") g.rect(0, 0, w, h).fill({ color: m.weather === "rain" ? 0x1a2028 : 0x8a8a90, alpha: 0.2 });
    if (!this.ritual) return;
    const r = this.ritual.t;
    if (r < RITUAL.burn) g.rect(0, 0, w, h).fill({ color: 0xff5a1a, alpha: 0.12 + (r / RITUAL.burn) * 0.25 });
    else if (r < RITUAL.ash) g.rect(0, 0, w, h).fill({ color: 0x3a3632, alpha: 0.45 });
    else g.rect(0, 0, w, h).fill({ color: 0x3a3632, alpha: 0.45 * (1 - (r - RITUAL.ash) / (RITUAL.end - RITUAL.ash)) });
  }

  // ── Partikel ────────────────────────────────────────────────────────────────

  private clearParticles(): void {
    this.particles = [];
    this.fx.particleChildren = [];
    this.fx.update();
    this.glow.particleChildren = [];
    this.glow.update();
  }

  private emit(p: Particle): void {
    const texture = p.streak ? this.streak : this.dot;
    if (!texture || this.particles.length > 520) return;
    const sprite = new Sprite({ texture, x: p.x, y: p.y, tint: p.color, alpha: p.streak ? 0.6 : 0.75 });
    this.particles.push({ ...p, sprite });
  }

  private spawn(): void {
    const m = this.shown;
    if (!m) return;
    const { w, h, ground } = this.size;
    const pal = SEASON_PALETTE[m.season];
    const fx = w * LAYOUT.forge;
    const fw = w * 0.045;
    if (m.forge && Math.random() < (m.forging ? 0.45 : 0.12)) {
      this.emit({ x: fx + fw * 0.8, y: ground - h * 0.27, vx: 3 + Math.random() * 6, vy: -8 - Math.random() * 8, life: 3.5, color: 0x6a6058, size: 1.5 + Math.random() * 2, grow: 1.2 });
    }
    if (m.forge && m.forging && Math.random() < 0.3) {
      this.emit({ x: fx - fw * 0.1, y: ground - h * 0.035, vx: (Math.random() - 0.5) * 40, vy: -25 - Math.random() * 25, life: 0.6, color: 0xffb04a, size: 1, grow: 0, glow: true });
    }
    // Rauch aus den Schornsteinen
    if (m.houses > 0 && !m.burning && Math.random() < 0.15) {
      const i = Math.floor(Math.random() * m.houses);
      const x = w * LAYOUT.housesFrom + (i / MAX_HOUSES) * w * (LAYOUT.housesTo - LAYOUT.housesFrom) + w * 0.012;
      this.emit({ x, y: ground - h * 0.17, vx: 4, vy: -6 - Math.random() * 4, life: 3, color: 0x7a7470, size: 1.2, grow: 0.8 });
    }
    if (m.burning && Math.random() < 0.9) {
      this.emit({ x: w * LAYOUT.housesFrom + Math.random() * w * 0.3, y: ground - h * 0.1, vx: (Math.random() - 0.5) * 8, vy: -22 - Math.random() * 22, life: 1.6, color: Math.random() < 0.5 ? 0xe07b39 : 0xffc35a, size: 1.4, grow: -0.5, glow: true });
    }
    if (m.weather === "rain") {
      for (let i = 0; i < 4; i += 1) this.emit({ x: Math.random() * w * 1.1, y: -5, vx: -40, vy: 260 + Math.random() * 80, life: 1, color: 0x9ab0c8, size: 1, grow: 0, streak: true });
    } else if ((m.weather === "snow" || pal.snow) && Math.random() < 0.6) {
      this.emit({ x: Math.random() * w, y: -4, vx: (Math.random() - 0.5) * 10, vy: 14 + Math.random() * 14, life: 14, color: 0xf2f2f2, size: 1 + Math.random() * 1.3, grow: 0, sway: true });
    } else if (m.season === "autumn" && Math.random() < 0.12) {
      this.emit({ x: Math.random() * w, y: -4, vx: 10 + Math.random() * 10, vy: 12 + Math.random() * 8, life: 14, color: pal.leaves[Math.floor(Math.random() * pal.leaves.length)] ?? 0xa3532a, size: 1.4, grow: 0, sway: true });
    } else if (m.season === "spring" && Math.random() < 0.08) {
      this.emit({ x: Math.random() * w, y: -4, vx: 6, vy: 10 + Math.random() * 6, life: 14, color: 0xf0c8d8, size: 1.1, grow: 0, sway: true });
    }
    if (m.souls && Math.random() < 0.2) {
      this.emit({ x: w * LAYOUT.crypt + Math.random() * w * 0.06, y: ground + 2, vx: (Math.random() - 0.5) * 4, vy: -7 - Math.random() * 4, life: 4.5, color: 0x8fd8f0, size: 1.6, grow: 0, glow: true, sway: true });
    }
    if (m.alchemy && Math.random() < 0.05) {
      this.emit({ x: w * LAYOUT.alchemy + w * 0.009, y: ground - h * 0.4, vx: 2, vy: -5, life: 3, color: 0x6aff9a, size: 1.2, grow: 0.3, glow: true });
    }
    if (m.ravenGift && Math.random() < 0.1) {
      this.emit({ x: w * LAYOUT.keep + 16 + (Math.random() - 0.5) * 10, y: h * 0.17, vx: 0, vy: -8, life: 1.2, color: 0xffe08a, size: 1, grow: 0, glow: true });
    }
    // Ritual: Feuer, dann fallende Asche
    if (this.ritual) {
      const r = this.ritual.t;
      if (r < RITUAL.burn) {
        for (let i = 0; i < 6; i += 1) {
          this.emit({ x: w * (LAYOUT.housesFrom - 0.12) + Math.random() * w * 0.75, y: ground - Math.random() * h * 0.15, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 50, life: 1.2, color: Math.random() < 0.5 ? 0xff7a2a : 0xffd06a, size: 2 + Math.random() * 2, grow: -1, glow: true });
        }
      } else if (r < RITUAL.end - 1) {
        for (let i = 0; i < 3; i += 1) this.emit({ x: Math.random() * w, y: -4, vx: (Math.random() - 0.5) * 12, vy: 18 + Math.random() * 14, life: 8, color: 0x8a8580, size: 1 + Math.random(), grow: 0, sway: true });
      }
    }
  }

  private step(dt: number): void {
    if (!this.animate) return;
    this.time += dt;
    // Kamera folgt dem Zeiger weich (Parallax)
    this.camera.x += (this.pointer.x - this.camera.x) * Math.min(1, dt * 3);
    this.camera.y += (this.pointer.y - this.camera.y) * Math.min(1, dt * 3);
    const layer = (c: Container, depth: number): void => {
      c.position.set(-this.camera.x * PARALLAX_PX * depth, -this.camera.y * PARALLAX_PX * depth * 0.35);
    };
    layer(this.far, 0.15);
    layer(this.mid, 0.4);
    layer(this.village, 0.75);
    layer(this.foreground, 1.2);
    this.clouds.x = -((this.time * 4) % this.size.w) - this.camera.x * PARALLAX_PX * 0.08;
    // Wackeln klingt ab
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const a = this.shakeAmp * Math.max(0, Math.min(1, this.shakeTime));
      this.app.stage.position.set((Math.random() - 0.5) * a * 2, (Math.random() - 0.5) * a * 2);
      if (this.shakeTime <= 0) {
        this.shakeAmp = 0;
        this.app.stage.position.set(0, 0);
      }
    }
    this.stepRitual(dt);
    this.drawAnim();
    this.spawn();
    const h = this.size.h;
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0 && p.y < h + 10);
    const off = this.village.position;
    for (const p of this.particles) {
      const sway = p.sway ? Math.sin(this.time * 2 + p.y * 0.05) * 0.3 : 0;
      p.x += p.vx * dt + sway;
      p.y += p.vy * dt;
      p.size = Math.max(0.4, p.size + p.grow * dt);
      const sprite = p.sprite;
      sprite.x = p.x - (p.streak ? 0 : p.size) + off.x;
      sprite.y = p.y - (p.streak ? 0 : p.size) + off.y;
      if (!p.streak) {
        sprite.scaleX = sprite.scaleY = p.size / DOT_RADIUS;
        sprite.alpha = Math.min(1, p.life) * (p.glow ? 0.9 : 0.7);
      }
    }
    // Ein Array-Tausch statt removeParticle je Partikel: O(n) pro Frame.
    this.fx.particleChildren = this.particles.filter((p) => !p.glow).map((p) => p.sprite);
    this.glow.particleChildren = this.particles.filter((p) => p.glow).map((p) => p.sprite);
    this.fx.update();
    this.glow.update();
  }

  private stepRitual(dt: number): void {
    const r = this.ritual;
    if (!r) return;
    const before = r.t;
    r.t += dt;
    // Phasenwechsel und Wiederaufbau zeichnen die statische Ebene neu (höchstens alle 0,25 s).
    const crossed = (mark: number): boolean => before < mark && r.t >= mark;
    if (crossed(RITUAL.burn)) this.shake(3, 0.8);
    if (crossed(RITUAL.burn) || (r.t > RITUAL.ash && Math.floor(r.t * 4) !== Math.floor(before * 4))) this.draw();
    if (r.t >= RITUAL.end) {
      this.ritual = null;
      this.draw();
    }
  }
}
