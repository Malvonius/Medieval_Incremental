import type { DeepReadonly } from "../core/types";
import type { GameState } from "../game/state";
import type { UpgradeEffect, VowId } from "./balance";
import type { FlagId, ResourceId } from "./ids";

// ── Zufallsereignisse ─────────────────────────────────────────────────────────

export type EventEffect =
  | { readonly kind: "gainSeconds"; readonly resource: ResourceId; readonly seconds: number }
  | { readonly kind: "loseFraction"; readonly resource: ResourceId; readonly fraction: number }
  | { readonly kind: "prisoners"; readonly amount: number }
  | { readonly kind: "loseSoldiers"; readonly fraction: number }
  | { readonly kind: "buff"; readonly resource: ResourceId; readonly factor: number; readonly seconds: number };

export interface EventChoice {
  readonly label: string;
  readonly effects: readonly EventEffect[];
}

export interface EventDef {
  readonly title: string;
  readonly text: string;
  readonly condition: (s: DeepReadonly<GameState>) => boolean;
  readonly choices: readonly [EventChoice, ...EventChoice[]];
}

/** Ein Wurf alle EVENT_ROLL_SECONDS Spielzeit mit Wahrscheinlichkeit EVENT_CHANCE. */
export const EVENT_ROLL_SECONDS = 240;
export const EVENT_CHANCE = 0.5;

export const EVENTS = {
  harvest: {
    title: "Eine gute Ernte",
    text: "Zum ersten Mal seit der Pest biegen sich die Ähren. Die Bauern wagen zu lächeln.",
    condition: (s) => s.tiles.keep,
    choices: [
      { label: "Ein Fest ausrichten (Gold ×2 für 5 min)", effects: [{ kind: "buff", resource: "gold", factor: 2, seconds: 300 }] },
      { label: "Alles einlagern (+5 min Goldproduktion)", effects: [{ kind: "gainSeconds", resource: "gold", seconds: 300 }] },
    ],
  },
  plague: {
    title: "Die Pest kehrt zurück",
    text: "In den Hütten am Fluss husten die Kinder Blut. Die Alten schlagen Kreuze.",
    condition: (s) => s.buildings.serf >= 20,
    choices: [
      { label: "Quarantäne (−20 % Gold)", effects: [{ kind: "loseFraction", resource: "gold", fraction: 0.2 }] },
      { label: "Beten und hoffen (Gold ×0,5 für 5 min)", effects: [{ kind: "buff", resource: "gold", factor: 0.5, seconds: 300 }] },
    ],
  },
  merchant: {
    title: "Ein fahrender Händler",
    text: "Er verkauft Eisen aus dem Norden. Er fragt nicht, wofür. Du fragst nicht, woher.",
    condition: (s) => s.tiles.forge,
    choices: [
      { label: "Kaufen (−10 % Gold, +10 min Eisen)", effects: [{ kind: "loseFraction", resource: "gold", fraction: 0.1 }, { kind: "gainSeconds", resource: "iron", seconds: 600 }] },
      { label: "Ablehnen", effects: [] },
    ],
  },
  raid: {
    title: "Überfall bei Nacht",
    text: "Reiter ohne Wappen brennen eine Scheune nieder und verschwinden im Schwarzforst.",
    condition: (s) => s.tiles.warroom && s.warroom.soldiers >= 10,
    choices: [
      { label: "Verfolgen (−10 % Soldaten, +3 Gefangene)", effects: [{ kind: "loseSoldiers", fraction: 0.1 }, { kind: "prisoners", amount: 3 }] },
      { label: "Die Mauern halten (−15 % Gold)", effects: [{ kind: "loseFraction", resource: "gold", fraction: 0.15 }] },
    ],
  },
  wisp: {
    title: "Ein Licht in der Krypta",
    text: "Zwischen den Gebeinen tanzt ein Licht, das nicht zu den anderen gehört. Es will, dass du ihm folgst.",
    condition: (s) => s.tiles.crypt,
    choices: [
      { label: "Ihm folgen (+5 min Seelen)", effects: [{ kind: "gainSeconds", resource: "souls", seconds: 300 }] },
      { label: "Die Krypta versiegeln (Seelen ×2 für 10 min)", effects: [{ kind: "buff", resource: "souls", factor: 2, seconds: 600 }] },
    ],
  },
  pilgrims: {
    title: "Pilger am Tor",
    text: "Sie haben von der Predigt gehört. Sie sind barfuß aus Grauweiler gekommen.",
    condition: (s) => s.tiles.chapel,
    choices: [
      { label: "Aufnehmen (+10 min Glauben)", effects: [{ kind: "gainSeconds", resource: "faith", seconds: 600 }] },
      { label: "Abweisen (+2 min Goldproduktion)", effects: [{ kind: "gainSeconds", resource: "gold", seconds: 120 }] },
    ],
  },
} as const satisfies Record<string, EventDef>;

export type EventId = keyof typeof EVENTS;
export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

// ── Neues Spiel+ und Herausforderungen ────────────────────────────────────────

/** Jede Erinnerung (aus einem abgeschlossenen Spiel) erhöht alle Produktion. */
export const MEMORY_BONUS = 0.25;

export interface ChallengeDef {
  readonly name: string;
  readonly description: string;
  readonly restrictions: readonly UpgradeEffect[];
  readonly reward: UpgradeEffect;
  readonly rewardText: string;
}

type ChallengeKey = "iron_fist" | "poverty" | "silence";

export const CHALLENGES: Readonly<Record<ChallengeKey, ChallengeDef>> = {
  iron_fist: {
    name: "Rostige Klingen",
    description: "Eisen ×0,1 im gesamten Durchlauf.",
    restrictions: [{ kind: "resourceMult", resource: "iron", factor: 0.1 }],
    reward: { kind: "resourceMult", resource: "iron", factor: 2 },
    rewardText: "Dauerhaft Eisen ×2",
  },
  poverty: {
    name: "Leere Truhen",
    description: "Gold ×0,5 im gesamten Durchlauf.",
    restrictions: [{ kind: "resourceMult", resource: "gold", factor: 0.5 }],
    reward: { kind: "resourceMult", resource: "gold", factor: 1.5 },
    rewardText: "Dauerhaft Gold ×1,5",
  },
  silence: {
    name: "Stumme Glocken",
    description: "Steuern eintreiben bringt nichts, Glaube ×0,5.",
    restrictions: [
      { kind: "clickMult", factor: 0 },
      { kind: "resourceMult", resource: "faith", factor: 0.5 },
    ],
    reward: { kind: "resourceMult", resource: "faith", factor: 2 },
    rewardText: "Dauerhaft Glauben ×2",
  },
};

export type ChallengeId = ChallengeKey;
export const CHALLENGE_IDS = Object.keys(CHALLENGES) as ChallengeId[];

// ── Gelübde-Verbindungen ──────────────────────────────────────────────────────

export interface SynergyDef {
  readonly vows: readonly [VowId, VowId];
  readonly name: string;
  readonly description: string;
  readonly effect: UpgradeEffect;
}

export const SYNERGIES: readonly SynergyDef[] = [
  { vows: ["sword", "poverty"], name: "Der hungrige Krieg", description: "Seelen ×2 zusätzlich", effect: { kind: "resourceMult", resource: "souls", factor: 2 } },
  { vows: ["penance", "silence"], name: "Das stille Opfer", description: "Glauben ×2 zusätzlich", effect: { kind: "resourceMult", resource: "faith", factor: 2 } },
  { vows: ["silence", "sword"], name: "Die schweigende Wacht", description: "Wehrkraft ×1,5", effect: { kind: "defenseMult", factor: 1.5 } },
];

// ── Entscheidungen ────────────────────────────────────────────────────────────

export interface DecisionOption {
  readonly flag: FlagId;
  readonly label: string;
  readonly effect: UpgradeEffect;
}

export interface DecisionDef {
  readonly title: string;
  readonly text: string;
  readonly afterNode: string;
  readonly options: readonly [DecisionOption, DecisionOption];
}

export const DECISIONS = {
  trust: {
    title: "Wem vertraust du?",
    text: "Sera will Ilse in Ketten legen. Ilse schwört, dass nur ihr Wissen den Bischof aufhält. Beide können nicht bleiben.",
    afterNode: "a5_ilse",
    options: [
      { flag: "trustSera", label: "Sera vertrauen (Wehrkraft ×1,5)", effect: { kind: "defenseMult", factor: 1.5 } },
      { flag: "trustIlse", label: "Ilse vertrauen (Seelen ×3)", effect: { kind: "resourceMult", resource: "souls", factor: 3 } },
    ],
  },
} as const satisfies Record<string, DecisionDef>;

export type DecisionId = keyof typeof DECISIONS;
export const DECISION_IDS = Object.keys(DECISIONS) as DecisionId[];
