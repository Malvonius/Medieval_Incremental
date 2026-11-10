import { type Decimal, ZERO } from "../core/decimal";
import { recordFrom } from "../core/types";
import {
  BUILDING_IDS,
  type BuildingId,
  EXPEDITION_IDS,
  type ExpeditionId,
  type RecipeId,
  UPGRADE_IDS,
  type UpgradeId,
} from "../content/balance";
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

export interface GameState {
  resources: Record<ResourceId, Decimal>;
  /** Lebenslang erhaltene Mengen – Grundlage für Story-Trigger. */
  totals: Record<ResourceId, Decimal>;
  buildings: Record<BuildingId, number>;
  upgrades: Record<UpgradeId, boolean>;
  tiles: Record<TileId, boolean>;
  flags: Record<FlagId, boolean>;
  forge: ForgeState;
  warroom: WarroomState;
  dungeon: DungeonState;
  story: { completed: string[] };
  stats: { playSeconds: number; clicks: number };
  /** Epoch-Millisekunden des letzten Speicherns – Basis für Offline-Fortschritt. */
  lastSeen: number;
}

export function createInitialState(now: number): GameState {
  return {
    resources: recordFrom(RESOURCE_IDS, () => ZERO),
    totals: recordFrom(RESOURCE_IDS, () => ZERO),
    buildings: recordFrom(BUILDING_IDS, () => 0),
    upgrades: recordFrom(UPGRADE_IDS, () => false),
    tiles: recordFrom(TILE_IDS, () => false),
    flags: recordFrom(FLAG_IDS, () => false),
    forge: { queue: [], progress: 0 },
    warroom: { soldiers: 0, active: [], completed: recordFrom(EXPEDITION_IDS, () => 0), fallen: 0, seals: 0 },
    dungeon: { prisoners: 0, laborers: 0, intel: 0, interrogated: 0 },
    story: { completed: [] },
    stats: { playSeconds: 0, clicks: 0 },
    lastSeen: now,
  };
}

export function gain(state: GameState, resource: ResourceId, amount: Decimal): void {
  if (amount.lte(0)) return;
  state.resources[resource] = state.resources[resource].add(amount);
  state.totals[resource] = state.totals[resource].add(amount);
}

/** Lebende Soldaten inklusive der entsandten. */
export const aliveSoldiers = (state: { readonly warroom: { readonly soldiers: number; readonly active: readonly { readonly soldiers: number }[] } }): number =>
  state.warroom.active.reduce((sum, e) => sum + e.soldiers, state.warroom.soldiers);

export function spend(state: GameState, resource: ResourceId, amount: Decimal): void {
  const next = state.resources[resource].sub(amount);
  if (next.lt(0)) throw new Error(`Interner Fehler: ${resource} würde negativ (${next.toString()}).`);
  state.resources[resource] = next;
}
