import { nextRandom } from "../core/random";

/** Eine Note relativ zum Taktbeginn (in Schlägen). */
export interface Note {
  readonly beat: number;
  readonly midi: number;
  readonly beats: number;
  readonly voice: "lute" | "choir" | "drum";
  readonly velocity: number;
}

interface ActStyle {
  readonly root: number;
  /** Kirchentonart als Halbtonschritte ab Grundton. */
  readonly mode: readonly number[];
  readonly bpm: number;
  /** Rhythmus der Laute je Takt (Notenlängen in Schlägen, Summe 4). */
  readonly rhythms: readonly (readonly number[])[];
  /** Akkordfolge als Stufen (0 = Grundton), ein Akkord je Takt. */
  readonly progression: readonly number[];
  readonly choir: boolean;
  readonly drum: readonly number[];
}

const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const AEOLIAN = [0, 2, 3, 5, 7, 8, 10];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const MIXOLYDIAN = [0, 2, 4, 5, 7, 9, 10];

/** Je Akt eine eigene Stimmung – von der Laute im Burghof bis zum Trommelschlag der Belagerung. */
const ACT_I: ActStyle = { root: 62, mode: DORIAN, bpm: 84, rhythms: [[1, 1, 1, 1], [1.5, 0.5, 1, 1], [2, 1, 1]], progression: [0, 6, 5, 6], choir: false, drum: [] };

export const STYLES: readonly ActStyle[] = [
  ACT_I,
  { root: 57, mode: AEOLIAN, bpm: 96, rhythms: [[1, 0.5, 0.5, 1, 1], [1, 1, 2], [0.5, 0.5, 1, 1, 1]], progression: [0, 5, 6, 4], choir: false, drum: [0, 1.5, 2, 3] },
  { root: 64, mode: PHRYGIAN, bpm: 60, rhythms: [[2, 2], [3, 1], [4]], progression: [0, 1, 0, 6], choir: true, drum: [] },
  { root: 55, mode: MIXOLYDIAN, bpm: 66, rhythms: [[2, 1, 1], [1, 1, 2], [4]], progression: [0, 3, 6, 0], choir: true, drum: [] },
  { root: 62, mode: PHRYGIAN, bpm: 108, rhythms: [[0.5, 0.5, 1, 0.5, 0.5, 1], [1, 1, 1, 1], [1.5, 0.5, 2]], progression: [0, 1, 6, 1], choir: true, drum: [0, 1, 2, 2.5, 3] },
];

const BARS_PER_PHRASE = 8;

const degreeToMidi = (style: ActStyle, degree: number): number => {
  const n = style.mode.length;
  const octave = Math.floor(degree / n);
  const index = ((degree % n) + n) % n;
  return style.root + octave * 12 + (style.mode[index] ?? 0);
};

/**
 * Komponiert einen Takt: Lautenmelodie als Zufallsweg über die Tonleiter (deterministisch über den
 * Startwert), Chor-Akkord auf Grundton und Quinte, Rahmentrommel. Am Phrasenende kadenziert die Melodie zum Grundton.
 */
export function composeBar(act: number, bar: number, seed: number, previousDegree: number): { notes: Note[]; lastDegree: number; rng: number } {
  const style = STYLES[Math.min(Math.max(act, 1), STYLES.length) - 1] ?? ACT_I;
  let rng = seed;
  const rand = (): number => {
    const [value, next] = nextRandom(rng);
    rng = next;
    return value;
  };
  const notes: Note[] = [];
  const chord = style.progression[bar % style.progression.length] ?? 0;
  const cadence = bar % BARS_PER_PHRASE === BARS_PER_PHRASE - 1;
  const rhythm = cadence ? [2, 2] : (style.rhythms[Math.floor(rand() * style.rhythms.length)] ?? [4]);

  let degree = previousDegree;
  let beat = 0;
  rhythm.forEach((beats, i) => {
    if (cadence && i === rhythm.length - 1) degree = 7;
    else {
      // Kleine Schritte sind häufig, Sprünge selten – wie in einer Volksweise.
      const r = rand();
      const step = r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.85 ? 2 : r < 0.95 ? -2 : 0;
      degree = Math.min(12, Math.max(3, degree + step));
      if (i === 0 && rand() < 0.5) degree = chord + 7; // betonte Zählzeit trifft den Akkordton
    }
    notes.push({ beat, midi: degreeToMidi(style, degree), beats, voice: "lute", velocity: i === 0 ? 0.9 : 0.7 });
    beat += beats;
  });
  if (style.choir) {
    notes.push({ beat: 0, midi: degreeToMidi(style, chord), beats: 4, voice: "choir", velocity: 0.5 });
    notes.push({ beat: 0, midi: degreeToMidi(style, chord + 4), beats: 4, voice: "choir", velocity: 0.4 });
  }
  for (const b of style.drum) notes.push({ beat: b, midi: 0, beats: 0.25, voice: "drum", velocity: b === 0 ? 1 : 0.6 });
  return { notes, lastDegree: degree, rng };
}

export const secondsPerBeat = (act: number): number => 60 / (STYLES[Math.min(Math.max(act, 1), STYLES.length) - 1]?.bpm ?? 80);

const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/**
 * Spielt die Komposition mit Web Audio: Laute per Karplus-Strong (einmal je Tonhöhe berechnet und
 * zwischengespeichert), Chor als verstimmte Sägezähne durch zwei Formantfilter („a“), Rahmentrommel
 * als gefiltertes Rauschen. Ein Vorlauf-Planer setzt Noten 0,4 s im Voraus.
 */
export class MusicPlayer {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBarTime = 0;
  private bar = 0;
  private degree = 7;
  private rng = 0x5eed;
  private act = 1;
  private readonly lute = new Map<number, AudioBuffer>();
  private noise: AudioBuffer | null = null;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly out: AudioNode,
  ) {}

  setAct(act: number): void {
    this.act = act;
  }

  start(): void {
    if (this.timer !== null) return;
    this.nextBarTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 100);
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    this.scheduleUntil(this.ctx.currentTime + 0.4);
  }

  /** Plant alle Takte bis `time` (Sekunden im AudioContext) – auch für das Rendern in einen OfflineAudioContext. */
  scheduleUntil(time: number): void {
    const spb = secondsPerBeat(this.act);
    while (this.nextBarTime < time) {
      const { notes, lastDegree, rng } = composeBar(this.act, this.bar, this.rng, this.degree);
      this.degree = lastDegree;
      this.rng = rng;
      for (const n of notes) this.play(n, this.nextBarTime + n.beat * spb, n.beats * spb);
      this.nextBarTime += 4 * spb;
      this.bar += 1;
    }
  }

  private play(note: Note, at: number, duration: number): void {
    if (note.voice === "lute") this.pluck(note.midi, at, note.velocity);
    else if (note.voice === "choir") this.sing(note.midi, at, duration, note.velocity);
    else this.drum(at, note.velocity);
  }

  /** Karplus-Strong: Rauschimpuls in einer Verzögerungsschleife mit Tiefpass ergibt eine gezupfte Saite. */
  private luteBuffer(midi: number): AudioBuffer {
    const cached = this.lute.get(midi);
    if (cached) return cached;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * 1.6);
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    const period = Math.max(2, Math.round(rate / midiToHz(midi)));
    const ring = new Float32Array(period);
    let seed = midi * 7919;
    for (let i = 0; i < period; i += 1) {
      const [r, next] = nextRandom(seed);
      seed = next;
      ring[i] = r * 2 - 1;
    }
    for (let i = 0; i < length; i += 1) {
      const j = i % period;
      const sample = ring[j] ?? 0;
      data[i] = sample;
      ring[j] = 0.497 * (sample + (ring[(j + 1) % period] ?? 0));
    }
    this.lute.set(midi, buffer);
    return buffer;
  }

  private pluck(midi: number, at: number, velocity: number): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.luteBuffer(midi);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35 * velocity, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 1.5);
    source.connect(gain).connect(this.out);
    source.start(at);
    source.stop(at + 1.6);
  }

  private sing(midi: number, at: number, duration: number, velocity: number): void {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(0.06 * velocity, at + duration * 0.3);
    gain.gain.linearRampToValueAtTime(0.0001, at + duration);
    // Formanten des Vokals „a“
    const formants = [700, 1220].map((f) => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = f;
      filter.Q.value = 6;
      filter.connect(gain);
      return filter;
    });
    gain.connect(this.out);
    for (const detune of [-8, 0, 7]) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = midiToHz(midi - 12);
      osc.detune.value = detune;
      for (const f of formants) osc.connect(f);
      osc.start(at);
      osc.stop(at + duration + 0.05);
    }
  }

  private drum(at: number, velocity: number): void {
    if (!this.noise) {
      const length = Math.floor(this.ctx.sampleRate * 0.3);
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      let seed = 42;
      for (let i = 0; i < length; i += 1) {
        const [r, next] = nextRandom(seed);
        seed = next;
        data[i] = (r * 2 - 1) * (1 - i / length) ** 3;
      }
    }
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.9 * velocity;
    source.connect(filter).connect(gain).connect(this.out);
    source.start(at);
  }
}
