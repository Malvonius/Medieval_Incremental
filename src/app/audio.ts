import type { Settings } from "./settings";

export type Cue = "buy" | "collect" | "battle" | "story" | "ritual";

/**
 * Vollständig synthetischer Sound (keine Audiodateien): ein tiefer Drone je Akt,
 * kurze Effekte je Ereignis und ein Tiefpass, der in der Krypta zufällt.
 * Der AudioContext entsteht erst nach einer Nutzergeste (Autoplay-Regeln der Browser).
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private drone: OscillatorNode[] = [];
  private enabled = false;
  private volume = 0.5;
  private act = 1;

  apply(settings: Settings): void {
    this.enabled = settings.sound;
    this.volume = settings.volume;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.enabled ? this.volume * 0.4 : 0, this.ctx.currentTime, 0.2);
  }

  /** Muss aus einem Klick- oder Tastatur-Handler heraus aufgerufen werden. */
  unlock(): void {
    if (this.ctx || !this.enabled || typeof AudioContext === "undefined") {
      void this.ctx?.resume();
      return;
    }
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = this.volume * 0.4;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2_000;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    filter.connect(master).connect(analyser).connect(ctx.destination);
    this.analyser = analyser;
    this.ctx = ctx;
    this.master = master;
    this.filter = filter;
    this.startDrone();
  }

  /** Effektivwert (RMS) des aktuellen Ausgangssignals, 0 = Stille. Für Tests und Pegelanzeige. */
  level(): number {
    const analyser = this.analyser;
    if (!analyser) return 0;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const s of samples) sum += s * s;
    return Math.sqrt(sum / samples.length);
  }

  get running(): boolean {
    return this.ctx?.state === "running";
  }

  setAct(act: number): void {
    if (act === this.act) return;
    this.act = act;
    this.startDrone();
  }

  /** Gedämpfter Klang unter der Erde. */
  setMuffled(muffled: boolean): void {
    if (this.filter && this.ctx) this.filter.frequency.setTargetAtTime(muffled ? 380 : 2_000, this.ctx.currentTime, 0.3);
  }

  private startDrone(): void {
    const { ctx, filter } = this;
    if (!ctx || !filter) return;
    for (const osc of this.drone) osc.stop();
    // Jeder Akt sinkt um einen Ganzton: die Stimmung wird düsterer.
    const base = 55 * 2 ** (-(this.act - 1) * (2 / 12));
    this.drone = [base, base * 1.005, base * 1.5].map((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 2 ? "sine" : "sawtooth";
      osc.frequency.value = freq;
      gain.gain.value = i === 2 ? 0.05 : 0.03;
      osc.connect(gain).connect(filter);
      osc.start();
      return osc;
    });
  }

  play(cue: Cue): void {
    const { ctx, filter } = this;
    if (!ctx || !filter || !this.enabled) return;
    const t = ctx.currentTime;
    const tone = (freq: number, duration: number, type: OscillatorType, peak: number, delay = 0): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(peak, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + duration);
      osc.connect(gain).connect(filter);
      osc.start(t + delay);
      osc.stop(t + delay + duration);
    };
    switch (cue) {
      case "collect":
        return tone(880, 0.08, "triangle", 0.08);
      case "buy":
        tone(330, 0.12, "triangle", 0.12);
        return tone(495, 0.15, "triangle", 0.1, 0.05);
      case "battle":
        return [110, 98, 82].forEach((f, i) => tone(f, 0.5, "sawtooth", 0.15, i * 0.12));
      case "story":
        // Glocke: Grundton plus unharmonische Obertöne mit langem Nachklang.
        return [220, 440 * 1.19, 660 * 1.07].forEach((f, i) => tone(f, 2.5 - i * 0.5, "sine", 0.2 / (i + 1)));
      case "ritual":
        return [65, 49].forEach((f, i) => tone(f, 3, "sawtooth", 0.2, i * 0.4));
    }
  }
}

/** Welche Aktion welchen Klang auslöst; fehlende Aktionen bleiben still. */
export const ACTION_CUES: Readonly<Partial<Record<string, Cue>>> = {
  collect: "collect",
  buyBuilding: "buy",
  buyUpgrade: "buy",
  craft: "buy",
  recruit: "buy",
  research: "buy",
  swearVow: "buy",
  buildFortification: "buy",
  launchExpedition: "battle",
  battle: "battle",
  ritual: "ritual",
};

export const audio = new AudioEngine();
