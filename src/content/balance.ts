import type { GeometricCost } from "../core/economy";
import type { FlagId, ResourceId, TileId } from "./ids";

/**
 * Alle Balancing-Werte an einem Ort. Änderungen hier mit `npm run sim` prüfen:
 * Der Bot misst, ob das Pacing (Zeit pro Story-Knoten) noch im Soll liegt.
 */

export const TICK_SECONDS = 0.1;
export const CLICK_BASE_GOLD = 1;
/** Jedes Schwert in der Waffenkammer und jeder lebende Soldat erhöht die Goldproduktion um diesen Anteil. */
export const SWORD_GOLD_BONUS = 0.02;
export const FORGE_QUEUE_CAPACITY = 5;

/** Jedes Ordenssiegel erhöht Gold- und Eisenproduktion um diesen Anteil. */
export const SEAL_BONUS = 0.05;
/** Jeder Fronarbeiter erhöht die Produktion um diese Anteile (vor Upgrades). */
export const LABOR_IRON_BONUS = 0.03;
export const LABOR_GOLD_BONUS = 0.005;
/** Hinweise pro Verhör (vor Upgrades). */
export const INTEL_PER_INTERROGATION = 1;
export const EXPEDITION_SLOTS = 1;

/** Story-Schwellen von Akt II – von Story-Triggern und Kerker-Anzeige gemeinsam genutzt. */
export const INTEL_FOR_OUTPOST = 5;
export const INTEL_FOR_KOMTUREI = 24;
export const SEALS_FOR_KOMTUREI = 4;

/** Rekrutierung: Gold geometrisch nach Anzahl lebender Soldaten, dazu ein Schwert je Soldat. */
export const RECRUIT_COST: GeometricCost = { base: 5_000, growth: 1.04 };
export const RECRUIT_SWORDS = 1;

export const OFFLINE_MIN_SECONDS = 60;
export const OFFLINE_CAP_SECONDS = 2 * 60 * 60;
export const OFFLINE_EFFICIENCY = 0.5;
/** Lücken im laufenden Tab (z. B. Hintergrund) ab dieser Länge werden als Aufholphase verrechnet. */
export const GAP_THRESHOLD_SECONDS = 2;

export interface BuildingDef {
  readonly name: string;
  readonly description: string;
  readonly tile: TileId;
  readonly costResource: ResourceId;
  readonly cost: GeometricCost;
  readonly produces: ResourceId;
  /** Produktion pro Einheit und Sekunde vor Multiplikatoren. */
  readonly baseRate: number;
  /** Sichtbar erst, wenn dieses Story-Flag gesetzt ist. */
  readonly requiresFlag: FlagId | null;
}

export const BUILDINGS = {
  serf: {
    name: "Leibeigener",
    description: "Pflügt den verbrannten Acker. Klagt nicht. Noch nicht.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 10, growth: 1.15 },
    produces: "gold",
    baseRate: 0.2,
    requiresFlag: null,
  },
  woodcutter: {
    name: "Holzfäller",
    description: "Schlägt Holz im Schwarzforst, solange das Licht reicht.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 120, growth: 1.15 },
    produces: "gold",
    baseRate: 1.5,
    requiresFlag: null,
  },
  mill: {
    name: "Mühle",
    description: "Ihr Rad knarrt die ganze Nacht. Niemand fragt, was sie mahlt.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 1_500, growth: 1.15 },
    produces: "gold",
    baseRate: 9,
    requiresFlag: null,
  },
  market: {
    name: "Marktstand",
    description: "Salz, Talg und Gerüchte – alles hat seinen Preis.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 20_000, growth: 1.15 },
    produces: "gold",
    baseRate: 55,
    requiresFlag: null,
  },
  tollhouse: {
    name: "Zollhaus",
    description: "Wer die Brücke von Vhal überquert, zahlt. Wer nicht zahlt, schwimmt.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 300_000, growth: 1.15 },
    produces: "gold",
    baseRate: 350,
    requiresFlag: null,
  },
  granary: {
    name: "Kornspeicher",
    description: "Wer das Korn hat, hat die Hungernden. Wer die Hungernden hat, hat das Land.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 5_000_000, growth: 1.15 },
    produces: "gold",
    baseRate: 2_200,
    requiresFlag: "act1Complete",
  },
  mint: {
    name: "Münzpräge",
    description: "Silber mit deinem Antlitz – und etwas weniger Silber, als draufsteht.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 80_000_000, growth: 1.15 },
    produces: "gold",
    baseRate: 15_000,
    requiresFlag: "act1Complete",
  },
  mine: {
    name: "Erzstollen",
    description: "Tief im Berg schürfen Gefangene nach Eisen.",
    tile: "forge",
    costResource: "gold",
    cost: { base: 400, growth: 1.18 },
    produces: "iron",
    baseRate: 0.6,
    requiresFlag: null,
  },
} as const satisfies Record<string, BuildingDef>;

export type BuildingId = keyof typeof BUILDINGS;
export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

export interface RecipeDef {
  readonly name: string;
  readonly description: string;
  readonly tile: TileId;
  readonly inputs: Readonly<Partial<Record<ResourceId, number>>>;
  readonly output: ResourceId;
  readonly durationSeconds: number;
}

export const RECIPES = {
  sword: {
    name: "Langschwert",
    description: `Jede Klinge in der Waffenkammer hebt die Goldproduktion um ${SWORD_GOLD_BONUS * 100} %.`,
    tile: "forge",
    inputs: { iron: 30, gold: 400 },
    output: "swords",
    durationSeconds: 20,
  },
} as const satisfies Record<string, RecipeDef>;

export type RecipeId = keyof typeof RECIPES;
export const RECIPE_IDS = Object.keys(RECIPES) as RecipeId[];

export type UpgradeEffect =
  | { readonly kind: "buildingMult"; readonly building: BuildingId; readonly factor: number }
  | { readonly kind: "clickMult"; readonly factor: number }
  | { readonly kind: "craftSpeed"; readonly recipe: RecipeId; readonly factor: number }
  | { readonly kind: "queueCapacity"; readonly add: number }
  | { readonly kind: "expeditionSpeed"; readonly factor: number }
  | { readonly kind: "expeditionSlots"; readonly add: number }
  | { readonly kind: "expeditionLosses"; readonly factor: number }
  | { readonly kind: "intelYield"; readonly add: number }
  | { readonly kind: "laborBonus"; readonly factor: number };

export interface UpgradeDef {
  readonly name: string;
  readonly description: string;
  readonly tile: TileId;
  readonly costResource: ResourceId;
  readonly cost: number;
  /** Sichtbar erst ab dieser Anzahl eines Gebäudes. */
  readonly requires: { readonly building: BuildingId; readonly count: number } | null;
  readonly requiresFlag: FlagId | null;
  readonly effect: UpgradeEffect;
}

export const UPGRADES = {
  stern_reeve: {
    name: "Strenger Vogt",
    description: "Steuern eintreiben bringt das Dreifache.",
    tile: "keep",
    costResource: "gold",
    cost: 60,
    requires: null,
    requiresFlag: null,
    effect: { kind: "clickMult", factor: 3 },
  },
  iron_sickles: {
    name: "Eiserne Sicheln",
    description: "Leibeigene produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 250,
    requires: { building: "serf", count: 10 },
    requiresFlag: null,
    effect: { kind: "buildingMult", building: "serf", factor: 2 },
  },
  heavy_axes: {
    name: "Schwere Äxte",
    description: "Holzfäller produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 3_000,
    requires: { building: "woodcutter", count: 10 },
    requiresFlag: null,
    effect: { kind: "buildingMult", building: "woodcutter", factor: 2 },
  },
  tithe_ledger: {
    name: "Zehntbuch",
    description: "Ein Buch voller Schulden. Steuern eintreiben bringt das Fünffache.",
    tile: "keep",
    costResource: "gold",
    cost: 8_000,
    requires: { building: "mill", count: 5 },
    requiresFlag: null,
    effect: { kind: "clickMult", factor: 5 },
  },
  waterwheel: {
    name: "Mühlrad aus Schwarzeiche",
    description: "Mühlen produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 40_000,
    requires: { building: "mill", count: 10 },
    requiresFlag: null,
    effect: { kind: "buildingMult", building: "mill", factor: 2 },
  },
  serf_levy: {
    name: "Frondienst",
    description: "Leibeigene arbeiten auch sonntags. Dreifache Produktion.",
    tile: "keep",
    costResource: "gold",
    cost: 150_000,
    requires: { building: "serf", count: 40 },
    requiresFlag: null,
    effect: { kind: "buildingMult", building: "serf", factor: 3 },
  },
  guild_charter: {
    name: "Zunftbrief",
    description: "Marktstände produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 500_000,
    requires: { building: "market", count: 10 },
    requiresFlag: null,
    effect: { kind: "buildingMult", building: "market", factor: 2 },
  },
  bellows: {
    name: "Blasebalg aus Ochsenleder",
    description: "Die Schmiede arbeitet doppelt so schnell.",
    tile: "forge",
    costResource: "gold",
    cost: 5_000,
    requires: { building: "mine", count: 3 },
    requiresFlag: null,
    effect: { kind: "craftSpeed", recipe: "sword", factor: 2 },
  },
  rich_vein: {
    name: "Reiche Erzader",
    description: "Erzstollen fördern doppelt so viel Eisen.",
    tile: "forge",
    costResource: "gold",
    cost: 25_000,
    requires: { building: "mine", count: 8 },
    requiresFlag: null,
    effect: { kind: "buildingMult", building: "mine", factor: 2 },
  },
  quench_oil: {
    name: "Härteöl",
    description: "Die Schmiede arbeitet nochmals doppelt so schnell.",
    tile: "forge",
    costResource: "gold",
    cost: 120_000,
    requires: { building: "mine", count: 12 },
    requiresFlag: null,
    effect: { kind: "craftSpeed", recipe: "sword", factor: 2 },
  },
  granary_vaults: {
    name: "Gewölbe unter dem Speicher",
    description: "Kornspeicher produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 150_000_000,
    requires: { building: "granary", count: 10 },
    requiresFlag: null,
    effect: { kind: "buildingMult", building: "granary", factor: 2 },
  },
  debased_coin: {
    name: "Gestreckte Münze",
    description: "Münzprägen produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 2_500_000_000,
    requires: { building: "mint", count: 10 },
    requiresFlag: null,
    effect: { kind: "buildingMult", building: "mint", factor: 2 },
  },
  journeymen: {
    name: "Gesellen für Brannoc",
    description: "Die Schmiede arbeitet doppelt so schnell.",
    tile: "forge",
    costResource: "gold",
    cost: 2_000_000,
    requires: null,
    requiresFlag: "act1Complete",
    effect: { kind: "craftSpeed", recipe: "sword", factor: 2 },
  },
  second_hearth: {
    name: "Zweite Esse",
    description: "Die Warteschlange der Schmiede fasst 5 Aufträge mehr.",
    tile: "forge",
    costResource: "gold",
    cost: 1_000_000,
    requires: null,
    requiresFlag: "act1Complete",
    effect: { kind: "queueCapacity", add: 5 },
  },
  war_map: {
    name: "Kriegskarte von Vhal",
    description: "Expeditionen dauern ein Drittel kürzer.",
    tile: "warroom",
    costResource: "gold",
    cost: 8_000_000,
    requires: null,
    requiresFlag: null,
    effect: { kind: "expeditionSpeed", factor: 1.5 },
  },
  field_surgeon: {
    name: "Feldscher",
    description: "Halbiert die Verluste auf Expeditionen.",
    tile: "warroom",
    costResource: "gold",
    cost: 30_000_000,
    requires: null,
    requiresFlag: null,
    effect: { kind: "expeditionLosses", factor: 0.5 },
  },
  second_captain: {
    name: "Zweite Hauptfrau",
    description: "Eine weitere Expedition kann gleichzeitig unterwegs sein.",
    tile: "warroom",
    costResource: "gold",
    cost: 60_000_000,
    requires: null,
    requiresFlag: "outpostKnown",
    effect: { kind: "expeditionSlots", add: 1 },
  },
  thumbscrews: {
    name: "Daumenschrauben",
    description: "Jedes Verhör bringt einen zusätzlichen Hinweis.",
    tile: "dungeon",
    costResource: "gold",
    cost: 5_000_000,
    requires: null,
    requiresFlag: null,
    effect: { kind: "intelYield", add: 1 },
  },
  blackiron_chains: {
    name: "Ketten aus Schwarzeisen",
    description: "Fronarbeiter bringen den doppelten Bonus.",
    tile: "dungeon",
    costResource: "gold",
    cost: 40_000_000,
    requires: null,
    requiresFlag: null,
    effect: { kind: "laborBonus", factor: 2 },
  },
} as const satisfies Record<string, UpgradeDef>;

export type UpgradeId = keyof typeof UPGRADES;
export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];

export interface ExpeditionReward {
  /** Beute in Sekunden der aktuellen Goldproduktion – bleibt so über das ganze Spiel relevant. */
  readonly goldSeconds: number;
  readonly iron: number;
  readonly prisoners: number;
  readonly seals: number;
}

export interface ExpeditionDef {
  readonly name: string;
  readonly description: string;
  readonly soldiers: number;
  readonly durationSeconds: number;
  /** Anteil der entsandten Soldaten, der nicht zurückkehrt (vor Upgrades, abgerundet). */
  readonly lossRate: number;
  readonly requiresFlag: FlagId | null;
  readonly repeatable: boolean;
  readonly reward: ExpeditionReward;
}

export const EXPEDITIONS = {
  bandits: {
    name: "Banditenlager im Schwarzforst",
    description: "Gesindel, das Bauern ausraubt. Dein Gesindel.",
    soldiers: 8,
    durationSeconds: 120,
    lossRate: 0.2,
    requiresFlag: null,
    repeatable: true,
    reward: { goldSeconds: 45, iron: 0, prisoners: 2, seals: 0 },
  },
  toll_fort: {
    name: "Zollfeste an der Furt",
    description: "Ein Söldnerhauptmann erhebt Zoll im Namen des Ordens.",
    soldiers: 25,
    durationSeconds: 240,
    lossRate: 0.2,
    requiresFlag: null,
    repeatable: true,
    reward: { goldSeconds: 120, iron: 2_500, prisoners: 3, seals: 0 },
  },
  outpost: {
    name: "Vorposten des Grauen Ordens",
    description: "Ein Wachturm aus grauem Stein. Seine Fahne trägt kein Wappen.",
    soldiers: 60,
    durationSeconds: 420,
    lossRate: 0.25,
    requiresFlag: "outpostKnown",
    repeatable: true,
    reward: { goldSeconds: 180, iron: 0, prisoners: 4, seals: 1 },
  },
  komturei: {
    name: "Die Komturei von Grauweiler",
    description: "Das Herz des Ordens in diesem Land. Wer sie nimmt, nimmt ihm die Stimme.",
    soldiers: 200,
    durationSeconds: 1_200,
    lossRate: 0.4,
    requiresFlag: "komtureiKnown",
    repeatable: false,
    reward: { goldSeconds: 600, iron: 0, prisoners: 10, seals: 5 },
  },
} as const satisfies Record<string, ExpeditionDef>;

export type ExpeditionId = keyof typeof EXPEDITIONS;
export const EXPEDITION_IDS = Object.keys(EXPEDITIONS) as ExpeditionId[];
