import type { DeepReadonly } from "../../core/types";
import { BUILDINGS, BUILDING_IDS, FORTIFICATION_IDS, WAVES } from "../../content/balance";
import type { SeasonId } from "../../content/living";
import { seasonOf } from "../../game/living";
import type { GameState } from "../../game/state";

/**
 * Alles, was die Szene darstellt – abgeleitet aus dem Spielstand, ohne eigene Spiellogik.
 * Ändert sich etwas hier, wird die statische Ebene neu gerastert; schnell wechselnde Werte
 * (Schlachtfortschritt) stehen deshalb separat in `SceneDynamics`.
 */
export interface SceneModel {
  readonly act: number;
  readonly houses: number;
  readonly forge: boolean;
  readonly mill: boolean;
  readonly market: boolean;
  readonly forging: boolean;
  readonly chapel: boolean;
  readonly tower: boolean;
  readonly souls: boolean;
  readonly alchemy: boolean;
  readonly warroom: boolean;
  readonly burning: boolean;
  readonly walls: number;
  readonly dead: number;
  readonly ending: "light" | "ash" | null;
  /** Regen während der Pest, Schnee während der Belagerung. */
  readonly weather: "clear" | "rain" | "snow";
  readonly season: SeasonId;
  /** Figuren im Dorf, abgeleitet aus den echten Spielwerten. */
  readonly peasants: number;
  readonly soldiers: number;
  readonly prisoners: number;
  readonly merchant: boolean;
  readonly raven: boolean;
  readonly ravenGift: boolean;
}

/** Werte, die sich fast jeden Frame ändern und nur die bewegten Ebenen betreffen. */
export interface SceneDynamics {
  /** Laufende Schlacht: Fortschritt 0–1, sonst null. */
  readonly battle: number | null;
}

export const MAX_HOUSES = 24;
const MAX_DEAD = 40;

/** Pest: das Ereignis steht an oder ihr Fluch (Gold ×0,5) wirkt noch. */
const plague = (s: DeepReadonly<GameState>): boolean =>
  s.events.pending === "plague" ||
  s.events.pending === "plague_wave" ||
  (s.events.buff?.resource === "gold" && s.events.buff.factor < 1);

/** Logarithmische Zuordnung: die ersten Einheiten zählen sichtbar, danach wächst die Menge langsam. */
const crowd = (n: number, max: number): number => (n <= 0 ? 0 : Math.min(max, 1 + Math.floor(Math.log2(n + 1))));

export function sceneModel(s: DeepReadonly<GameState>): SceneModel {
  let keep = 0;
  for (const id of BUILDING_IDS) if (BUILDINGS[id].tile === "keep") keep += s.buildings[id];
  let forts = 0;
  for (const id of FORTIFICATION_IDS) forts += s.siege.fortifications[id];
  const { flags } = s;
  const act = 1 + [flags.act1Complete, flags.act2Complete, flags.act3Complete, flags.act4Complete].filter(Boolean).length;
  const sieging = flags.act4Complete && s.siege.wave < WAVES.length;
  return {
    act,
    // Logarithmisch: die ersten Gebäude zählen sichtbar, später wächst das Dorf langsamer.
    houses: Math.min(MAX_HOUSES, Math.floor(Math.log2(keep + 1) * 3)),
    forge: s.tiles.forge,
    mill: s.buildings.mill > 0,
    market: s.buildings.market > 0,
    forging: s.forge.queue.length > 0,
    chapel: s.tiles.chapel,
    tower: s.buildings.bell_tower > 0 || flags.act4Complete,
    souls: s.tiles.crypt,
    alchemy: s.tiles.alchemy,
    warroom: s.tiles.warroom,
    // Nach dem Ritual brennt Vhal, bis es wieder aufgebaut ist.
    burning: s.ritual.performed > 0 && keep < 20,
    walls: Math.min(10, forts),
    dead: sieging ? Math.min(MAX_DEAD, 8 + s.siege.wave * 4) : 0,
    // Eintracht und Erwachen sind helle Enden: dieselbe Szene wie das Licht.
    ending: s.siege.ending === null ? null : s.siege.ending === "ash" ? "ash" : "light",
    weather: plague(s) ? "rain" : sieging || (flags.act4Complete && s.siege.ending === null) ? "snow" : "clear",
    season: seasonOf(s.stats.playSeconds),
    peasants: crowd(s.buildings.serf, 7),
    soldiers: crowd(s.warroom.soldiers, 6),
    prisoners: crowd(s.dungeon.prisoners, 3),
    merchant: s.merchant.present,
    raven: s.tiles.keep,
    ravenGift: s.raven.gift,
  };
}

export function sceneDynamics(s: DeepReadonly<GameState>): SceneDynamics {
  const wave = WAVES[s.siege.wave];
  const battle = s.siege.battle && wave ? 1 - s.siege.battle.remaining / wave.durationSeconds : null;
  return { battle };
}

/** Kurzschlüssel: die Szene wird nur neu gezeichnet, wenn sich etwas Sichtbares ändert. */
export const sceneKey = (m: SceneModel): string => JSON.stringify(m);
