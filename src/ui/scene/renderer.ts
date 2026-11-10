import { Application, Graphics } from "pixi.js";
import { MAX_HOUSES, type SceneModel } from "./model";

const SKY = [0x1b1712, 0x17141a, 0x121519, 0x1a1414, 0x200b0b] as const;
const STONE = 0x2c241d;
const ROOF = 0x4a2f22;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
  size: number;
}

/** Prozedurale 2D-Seitenansicht von Vhal. Statisches wird nur bei Modelländerung neu gezeichnet. */
export class SceneRenderer {
  private readonly app = new Application();
  private readonly world = new Graphics();
  private readonly fx = new Graphics();
  private particles: Particle[] = [];
  private model: SceneModel | null = null;
  private animate = true;

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: devicePixelRatio });
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world, this.fx);
    this.app.renderer.on("resize", () => this.draw());
    this.app.ticker.add((t) => this.step(t.deltaMS / 1000));
  }

  setAnimate(animate: boolean): void {
    this.animate = animate;
    if (!animate) {
      this.particles = [];
      this.fx.clear();
    }
  }

  update(model: SceneModel): void {
    this.model = model;
    this.draw();
  }

  destroy(): void {
    this.app.destroy(true, { children: true });
  }

  private get size(): { w: number; h: number } {
    return { w: this.app.screen.width, h: this.app.screen.height };
  }

  private draw(): void {
    const m = this.model;
    if (!m) return;
    const { w, h } = this.size;
    const g = this.world.clear();
    const ground = h * 0.82;
    const light = m.ending === "light";

    g.rect(0, 0, w, h).fill(light ? 0x2a2618 : (SKY[m.act - 1] ?? SKY[0]));
    g.circle(w * 0.9, h * 0.22, h * 0.1).fill({ color: m.act >= 5 && !light ? 0xa3302a : 0xd8cfb8, alpha: 0.8 });
    g.poly([0, ground, w * 0.2, h * 0.62, w * 0.45, ground, w * 0.7, h * 0.66, w, ground, w, h, 0, h]).fill(0x14110e);
    g.rect(0, ground, w, h - ground).fill(0x0e0c0b);

    // Burgfried mit Zinnen
    const kx = w * 0.12;
    const kw = w * 0.06;
    g.rect(kx, h * 0.3, kw, ground - h * 0.3).fill(STONE);
    for (let i = 0; i < 4; i += 1) g.rect(kx + (i * kw) / 3.5, h * 0.25, kw / 6, h * 0.06).fill(STONE);

    // Häuser
    const left = w * 0.22;
    const span = w * 0.38;
    for (let i = 0; i < m.houses; i += 1) {
      const x = left + (i / MAX_HOUSES) * span;
      const hh = h * (0.08 + ((i * 7) % 5) * 0.012);
      g.rect(x, ground - hh, w * 0.012, hh).fill(STONE);
      g.poly([x - 2, ground - hh, x + w * 0.006, ground - hh - h * 0.05, x + w * 0.012 + 2, ground - hh]).fill(m.burning ? 0x8a3a1a : ROOF);
    }

    if (m.forge) {
      const fx = w * 0.63;
      g.rect(fx, ground - h * 0.12, w * 0.03, h * 0.12).fill(STONE);
      g.rect(fx + w * 0.02, ground - h * 0.2, w * 0.006, h * 0.08).fill(STONE);
    }
    if (m.chapel) {
      const cx = w * 0.7;
      g.rect(cx, ground - h * 0.16, w * 0.04, h * 0.16).fill(STONE);
      g.poly([cx - 3, ground - h * 0.16, cx + w * 0.02, ground - h * 0.26, cx + w * 0.04 + 3, ground - h * 0.16]).fill(ROOF);
      if (m.tower) g.rect(cx + w * 0.045, ground - h * 0.34, w * 0.012, h * 0.34).fill(STONE);
      g.rect(cx + w * 0.019, ground - h * 0.32, 2, h * 0.06).fill(0xd4a54a);
      g.rect(cx + w * 0.012, ground - h * 0.3, w * 0.016, 2).fill(0xd4a54a);
    }
    // Palisade wächst mit den Befestigungen
    for (let i = 0; i < m.walls * 3; i += 1) {
      g.rect(w * 0.8 + i * 4, ground - h * (0.06 + m.walls * 0.012), 3, h * (0.06 + m.walls * 0.012)).fill(0x3a2a1c);
    }
    // Totenheer vor den Mauern, mit glühenden Augen
    for (let i = 0; i < m.dead; i += 1) {
      const x = w * 0.86 + ((i * 37) % 100) / 100 * w * 0.13;
      const y = ground - ((i * 13) % 7);
      g.rect(x, y - h * 0.07, 3, h * 0.07).fill(0x0a0908);
      g.circle(x + 1.5, y - h * 0.065, 1).fill(0xd1483f);
    }
  }

  private spawn(): void {
    const m = this.model;
    if (!m || this.particles.length > 120) return;
    const { w, h } = this.size;
    const ground = h * 0.82;
    if (m.forge && Math.random() < (m.forging ? 0.4 : 0.1)) {
      this.particles.push({ x: w * 0.643, y: ground - h * 0.2, vx: 2 + Math.random() * 8, vy: -6 - Math.random() * 10, life: 3, color: 0x5a5048, size: 2 + Math.random() * 3 });
    }
    if (m.burning && Math.random() < 0.8) {
      this.particles.push({ x: w * 0.22 + Math.random() * w * 0.38, y: ground - h * 0.1, vx: (Math.random() - 0.5) * 6, vy: -20 - Math.random() * 20, life: 1.5, color: 0xe07b39, size: 1.5 });
    }
    if (m.souls && Math.random() < 0.15) {
      this.particles.push({ x: w * 0.68 + Math.random() * w * 0.1, y: ground + 4, vx: (Math.random() - 0.5) * 3, vy: -8, life: 4, color: 0x8fb8c9, size: 1.5 });
    }
  }

  private step(dt: number): void {
    if (!this.animate) return;
    this.spawn();
    const g = this.fx.clear();
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.circle(p.x, p.y, p.size).fill({ color: p.color, alpha: Math.min(1, p.life) * 0.7 });
    }
  }
}
