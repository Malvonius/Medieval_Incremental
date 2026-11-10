import type { GeometricCost } from "../core/economy";
import type { ResourceId, TileId } from "./ids";

/**
 * Alle Balancing-Werte an einem Ort. Änderungen hier mit `npm run sim` prüfen:
 * Der Bot misst, ob das Pacing (Zeit pro Story-Knoten) noch im Soll liegt.
 */

export const TICK_SECONDS = 0.1;
export const CLICK_BASE_GOLD = 1;
/** Jedes Schwert in der Waffenkammer erhöht die Goldproduktion um diesen Anteil. */
export const SWORD_GOLD_BONUS = 0.02;
export const FORGE_QUEUE_CAPACITY = 5;

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
  },
  woodcutter: {
    name: "Holzfäller",
    description: "Schlägt Holz im Schwarzforst, solange das Licht reicht.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 120, growth: 1.15 },
    produces: "gold",
    baseRate: 1.5,
  },
  mill: {
    name: "Mühle",
    description: "Ihr Rad knarrt die ganze Nacht. Niemand fragt, was sie mahlt.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 1_500, growth: 1.15 },
    produces: "gold",
    baseRate: 9,
  },
  market: {
    name: "Marktstand",
    description: "Salz, Talg und Gerüchte – alles hat seinen Preis.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 20_000, growth: 1.15 },
    produces: "gold",
    baseRate: 55,
  },
  tollhouse: {
    name: "Zollhaus",
    description: "Wer die Brücke von Vhal überquert, zahlt. Wer nicht zahlt, schwimmt.",
    tile: "keep",
    costResource: "gold",
    cost: { base: 300_000, growth: 1.15 },
    produces: "gold",
    baseRate: 350,
  },
  mine: {
    name: "Erzstollen",
    description: "Tief im Berg schürfen Gefangene nach Eisen.",
    tile: "forge",
    costResource: "gold",
    cost: { base: 400, growth: 1.18 },
    produces: "iron",
    baseRate: 0.6,
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
  | { readonly kind: "craftSpeed"; readonly recipe: RecipeId; readonly factor: number };

export interface UpgradeDef {
  readonly name: string;
  readonly description: string;
  readonly tile: TileId;
  readonly costResource: ResourceId;
  readonly cost: number;
  /** Sichtbar erst ab dieser Anzahl eines Gebäudes. */
  readonly requires: { readonly building: BuildingId; readonly count: number } | null;
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
    effect: { kind: "clickMult", factor: 3 },
  },
  iron_sickles: {
    name: "Eiserne Sicheln",
    description: "Leibeigene produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 250,
    requires: { building: "serf", count: 10 },
    effect: { kind: "buildingMult", building: "serf", factor: 2 },
  },
  heavy_axes: {
    name: "Schwere Äxte",
    description: "Holzfäller produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 3_000,
    requires: { building: "woodcutter", count: 10 },
    effect: { kind: "buildingMult", building: "woodcutter", factor: 2 },
  },
  tithe_ledger: {
    name: "Zehntbuch",
    description: "Ein Buch voller Schulden. Steuern eintreiben bringt das Fünffache.",
    tile: "keep",
    costResource: "gold",
    cost: 8_000,
    requires: { building: "mill", count: 5 },
    effect: { kind: "clickMult", factor: 5 },
  },
  waterwheel: {
    name: "Mühlrad aus Schwarzeiche",
    description: "Mühlen produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 40_000,
    requires: { building: "mill", count: 10 },
    effect: { kind: "buildingMult", building: "mill", factor: 2 },
  },
  serf_levy: {
    name: "Frondienst",
    description: "Leibeigene arbeiten auch sonntags. Dreifache Produktion.",
    tile: "keep",
    costResource: "gold",
    cost: 150_000,
    requires: { building: "serf", count: 40 },
    effect: { kind: "buildingMult", building: "serf", factor: 3 },
  },
  guild_charter: {
    name: "Zunftbrief",
    description: "Marktstände produzieren doppelt so viel.",
    tile: "keep",
    costResource: "gold",
    cost: 500_000,
    requires: { building: "market", count: 10 },
    effect: { kind: "buildingMult", building: "market", factor: 2 },
  },
  bellows: {
    name: "Blasebalg aus Ochsenleder",
    description: "Die Schmiede arbeitet doppelt so schnell.",
    tile: "forge",
    costResource: "gold",
    cost: 5_000,
    requires: { building: "mine", count: 3 },
    effect: { kind: "craftSpeed", recipe: "sword", factor: 2 },
  },
  rich_vein: {
    name: "Reiche Erzader",
    description: "Erzstollen fördern doppelt so viel Eisen.",
    tile: "forge",
    costResource: "gold",
    cost: 25_000,
    requires: { building: "mine", count: 8 },
    effect: { kind: "buildingMult", building: "mine", factor: 2 },
  },
  quench_oil: {
    name: "Härteöl",
    description: "Die Schmiede arbeitet nochmals doppelt so schnell.",
    tile: "forge",
    costResource: "gold",
    cost: 120_000,
    requires: { building: "mine", count: 12 },
    effect: { kind: "craftSpeed", recipe: "sword", factor: 2 },
  },
} as const satisfies Record<string, UpgradeDef>;

export type UpgradeId = keyof typeof UPGRADES;
export const UPGRADE_IDS = Object.keys(UPGRADES) as UpgradeId[];
