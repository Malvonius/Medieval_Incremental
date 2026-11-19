import { type Decimal, ZERO } from "../core/decimal";
import { recordFrom } from "../core/types";
import {
  BUILDING_IDS,
  type BuildingId,
  ENDING_IDS,
  type EndingId,
  EXPEDITION_IDS,
  type ExpeditionId,
  FORTIFICATION_IDS,
  type FortificationId,
  RECIPE_IDS,
  RESEARCH_IDS,
  type RecipeId,
  type ResearchId,
  UPGRADE_IDS,
  type UpgradeId,
  VOW_IDS,
  type VowId,
} from "../content/balance";
import { ACHIEVEMENT_IDS, type AchievementId } from "../content/achievements";
import { CHALLENGE_IDS, type ChallengeId, type EventId } from "../content/depth";
import {
  AUTOMATION_DEFAULT_THRESHOLD,
  AUTOMATOR_IDS,
  type AutomatorId,
  CODEX_IDS,
  type CodexId,
  FACTION_IDS,
  type FactionId,
  MAP_CENTER,
  type OfficeId,
  RETAINER_IDS,
  type RetainerId,
  STATION_IDS,
  type StationId,
  TALENT_IDS,
  type TalentId,
} from "../content/extensions";
import { MERCHANT_FIRST_SECONDS, type OfferKind, PLAN_SIZE, RAVEN_GIFT_SECONDS } from "../content/living";
import { FLAG_IDS, type FlagId, RESOURCE_IDS, type ResourceId, TILE_IDS, type TileId } from "../content/ids";

export const SAVE_VERSION = 1;

export interface ForgeState {
  /** FIFO-Warteschlange; Kapazität ist klein und fest, daher genügt ein Array. */
  queue: RecipeId[];
  /** Fortschritt des vordersten Auftrags in Sekunden. */
  progress: number;
}

export interface ActiveExpedition {
  id: ExpeditionId;
  /** Verbleibende Sekunden. */
  remaining: number;
  soldiers: number;
}

export interface WarroomState {
  /** Verfügbare (nicht entsandte) Soldaten. */
  soldiers: number;
  active: ActiveExpedition[];
  completed: Record<ExpeditionId, number>;
  fallen: number;
  seals: number;
}

export interface DungeonState {
  prisoners: number;
  laborers: number;
  intel: number;
  interrogated: number;
}

export interface AlchemyState {
  active: { id: ResearchId; remaining: number } | null;
  completed: Record<ResearchId, boolean>;
}

export interface ChapelState {
  vows: Record<VowId, boolean>;
}

export interface RitualState {
  /** Gesammelte Asche – bleibt über alle Rituale erhalten. */
  ash: number;
  performed: number;
}

export interface SiegeState {
  /** Anzahl abgewehrter Wellen (Index der nächsten Welle). */
  wave: number;
  battle: { remaining: number } | null;
  fortifications: Record<FortificationId, number>;
  ending: EndingId | null;
}

export interface EventState {
  pending: EventId | null;
  /** Sekunden bis zum nächsten Ereigniswurf. */
  timer: number;
  buff: { resource: ResourceId; factor: number; remaining: number } | null;
  /** Geplante Folgeereignisse (Spielsekunde, ab der sie anstehen). */
  followUps: { id: EventId; at: number }[];
}

export type OfferMood = "new" | "deal" | "firm" | "offended" | "sold";

export interface MerchantOffer {
  kind: OfferKind;
  price: Decimal;
  amount: Decimal;
  mood: OfferMood;
}

export interface MerchantState {
  /** Sekunden bis zur Ankunft (abwesend) bzw. bis zur Abreise (anwesend). */
  timer: number;
  present: boolean;
  offers: MerchantOffer[];
}

/** Bleibt über Neues Spiel+ hinweg erhalten. */
export interface MetaState {
  ngPlus: number;
  memories: number;
  challenge: ChallengeId | null;
  challengesDone: Record<ChallengeId, boolean>;
  /** Zweite Prestige-Ebene: Glut aus dem Aufstieg, ausgegeben im Talentbaum. */
  embers: number;
  ascensions: number;
  talents: Record<TalentId, boolean>;
  endingsSeen: Record<EndingId, boolean>;
  codex: Record<CodexId, boolean>;
  /** Dauer abgeschlossener Läufe (Ritual, Neues Spiel+, Aufstieg), älteste zuerst, gedeckelt. */
  runLog: RunRecord[];
}

export type RunKind = "ritual" | "ngplus" | "ascend";
export interface RunRecord {
  kind: RunKind;
  seconds: number;
}
export const RUN_LOG_CAP = 50;

export interface AutobuyState {
  enabled: Record<AutomatorId, boolean>;
  /** Gebäude, die einzeln zum automatischen Kauf ausgewählt sind – ohne Ritual verfügbar. */
  picks: Record<BuildingId, boolean>;
  /** Schmiede-Rezepte, die automatisch in die Warteschlange kommen, sobald die Rohstoffe reichen. */
  recipePicks: Record<RecipeId, boolean>;
  /** Kaufen, wenn Kosten ≤ threshold × Vorrat (0 < threshold ≤ 1). */
  threshold: number;
  timer: number;
}

export interface RetainerState {
  level: number;
  office: OfficeId | null;
  equipped: boolean;
  /** 0–100; fällt sie auf 0, verlässt die Person Vhal. */
  loyalty: number;
  /** Erfüllte Auftragsschritte. */
  quest: number;
  /** Restsekunden des laufenden Auftrags, oder null. */
  questRemaining: number | null;
}

export interface WorkshopState {
  levels: Record<StationId, number>;
  ore: number;
  ingots: number;
  /** Bruchteile einer Klinge in Arbeit. */
  blades: number;
}

export interface GameState {
  resources: Record<ResourceId, Decimal>;
  /** Lebenslang erhaltene Mengen – Grundlage für Story-Trigger. */
  totals: Record<ResourceId, Decimal>;
  /** Erhaltene Mengen seit dem letzten Ritual der Asche – Grundlage für die Ascheberechnung. */
  runTotals: Record<ResourceId, Decimal>;
  buildings: Record<BuildingId, number>;
  upgrades: Record<UpgradeId, boolean>;
  tiles: Record<TileId, boolean>;
  flags: Record<FlagId, boolean>;
  forge: ForgeState;
  warroom: WarroomState;
  dungeon: DungeonState;
  alchemy: AlchemyState;
  chapel: ChapelState;
  ritual: RitualState;
  siege: SiegeState;
  /** completedAt[i] = Spielsekunde, in der completed[i] erreicht wurde. */
  story: { completed: string[]; completedAt: number[] };
  achievements: Record<AchievementId, boolean>;
  /** Zustand des deterministischen Zufallsgenerators (uint32). */
  rng: number;
  events: EventState;
  automation: { enabled: boolean; timer: number };
  meta: MetaState;
  autobuy: AutobuyState;
  factions: { rep: Record<FactionId, number>; courted: Record<FactionId, number> };
  /** null = (noch) nicht angeheuert. */
  retinue: Record<RetainerId, RetainerState | null>;
  /** Indizes eroberter Kartenfelder, die Burg zuerst. */
  map: { owned: number[] };
  workshop: WorkshopState;
  raven: { timer: number; gift: boolean; pokes: number };
  merchant: MerchantState;
  /** Burgplan: je Feld ein Gebäudeviertel oder leer. */
  plan: (BuildingId | null)[];
  stats: { playSeconds: number; clicks: number; eventsResolved: number; runStart: number };
  /** Epoch-Millisekunden des letzten Speicherns – Basis für Offline-Fortschritt. */
  lastSeen: number;
}

export function createInitialState(now: number): GameState {
  return {
    resources: recordFrom(RESOURCE_IDS, () => ZERO),
    totals: recordFrom(RESOURCE_IDS, () => ZERO),
    runTotals: recordFrom(RESOURCE_IDS, () => ZERO),
    buildings: recordFrom(BUILDING_IDS, () => 0),
    upgrades: recordFrom(UPGRADE_IDS, () => false),
    tiles: recordFrom(TILE_IDS, () => false),
    flags: recordFrom(FLAG_IDS, () => false),
    forge: { queue: [], progress: 0 },
    warroom: { soldiers: 0, active: [], completed: recordFrom(EXPEDITION_IDS, () => 0), fallen: 0, seals: 0 },
    dungeon: { prisoners: 0, laborers: 0, intel: 0, interrogated: 0 },
    alchemy: { active: null, completed: recordFrom(RESEARCH_IDS, () => false) },
    chapel: { vows: recordFrom(VOW_IDS, () => false) },
    ritual: { ash: 0, performed: 0 },
    siege: { wave: 0, battle: null, fortifications: recordFrom(FORTIFICATION_IDS, () => 0), ending: null },
    story: { completed: [], completedAt: [] },
    achievements: recordFrom(ACHIEVEMENT_IDS, () => false),
    // XOR liefert in JS int32 – erst >>> 0 macht daraus einen nicht-negativen uint32.
    rng: ((now >>> 0) ^ 0x9e3779b9) >>> 0,
    events: { pending: null, timer: 240, buff: null, followUps: [] },
    automation: { enabled: true, timer: 0 },
    meta: {
      ngPlus: 0,
      memories: 0,
      challenge: null,
      challengesDone: recordFrom(CHALLENGE_IDS, () => false),
      embers: 0,
      ascensions: 0,
      talents: recordFrom(TALENT_IDS, () => false),
      endingsSeen: recordFrom(ENDING_IDS, () => false),
      codex: recordFrom(CODEX_IDS, () => false),
      runLog: [],
    },
    autobuy: { enabled: recordFrom(AUTOMATOR_IDS, () => false), picks: recordFrom(BUILDING_IDS, () => false), recipePicks: recordFrom(RECIPE_IDS, () => false), threshold: AUTOMATION_DEFAULT_THRESHOLD, timer: 0 },
    factions: { rep: recordFrom(FACTION_IDS, () => 0), courted: recordFrom(FACTION_IDS, () => 0) },
    retinue: recordFrom(RETAINER_IDS, () => null),
    map: { owned: [MAP_CENTER] },
    workshop: { levels: recordFrom(STATION_IDS, () => 0), ore: 0, ingots: 0, blades: 0 },
    raven: { timer: RAVEN_GIFT_SECONDS, gift: false, pokes: 0 },
    merchant: { timer: MERCHANT_FIRST_SECONDS, present: false, offers: [] },
    plan: Array.from({ length: PLAN_SIZE }, () => null),
    stats: { playSeconds: 0, clicks: 0, eventsResolved: 0, runStart: 0 },
    lastSeen: now,
  };
}

export function gain(state: GameState, resource: ResourceId, amount: Decimal): void {
  if (amount.lte(0)) return;
  state.resources[resource] = state.resources[resource].add(amount);
  state.totals[resource] = state.totals[resource].add(amount);
  state.runTotals[resource] = state.runTotals[resource].add(amount);
}

/** Lebende Soldaten inklusive der entsandten. */
export const aliveSoldiers = (state: { readonly warroom: { readonly soldiers: number; readonly active: readonly { readonly soldiers: number }[] } }): number =>
  state.warroom.active.reduce((sum, e) => sum + e.soldiers, state.warroom.soldiers);

export function spend(state: GameState, resource: ResourceId, amount: Decimal): void {
  const next = state.resources[resource].sub(amount);
  if (next.lt(0)) throw new Error(`Interner Fehler: ${resource} würde negativ (${next.toString()}).`);
  state.resources[resource] = next;
}
