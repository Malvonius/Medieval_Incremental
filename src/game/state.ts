import { type Decimal, ZERO } from "../core/decimal";
import { recordFrom } from "../core/types";
import {
  BUILDING_IDS,
  type BuildingId,
  type EndingId,
  EXPEDITION_IDS,
  type ExpeditionId,
  FORTIFICATION_IDS,
  type FortificationId,
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
}

/** Bleibt über Neues Spiel+ hinweg erhalten. */
export interface MetaState {
  ngPlus: number;
  memories: number;
  challenge: ChallengeId | null;
  challengesDone: Record<ChallengeId, boolean>;
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
  stats: { playSeconds: number; clicks: number };
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
    events: { pending: null, timer: 240, buff: null },
    automation: { enabled: true, timer: 0 },
    meta: { ngPlus: 0, memories: 0, challenge: null, challengesDone: recordFrom(CHALLENGE_IDS, () => false) },
    stats: { playSeconds: 0, clicks: 0 },
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
