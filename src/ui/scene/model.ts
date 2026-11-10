import type { DeepReadonly } from "../../core/types";
import { BUILDINGS, BUILDING_IDS, FORTIFICATION_IDS, WAVES } from "../../content/balance";
import type { GameState } from "../../game/state";

/** Alles, was die Szene darstellt – abgeleitet aus dem Spielstand, ohne eigene Spiellogik. */
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
  readonly burning: boolean;
  readonly walls: number;
  readonly dead: number;
  readonly ending: "light" | "ash" | null;
}

export const MAX_HOUSES = 24;
const MAX_DEAD = 40;

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
    // Nach dem Ritual brennt Vhal, bis es wieder aufgebaut ist.
    burning: s.ritual.performed > 0 && keep < 20,
    walls: Math.min(10, forts),
    dead: sieging ? Math.min(MAX_DEAD, 8 + s.siege.wave * 4) : 0,
    ending: s.siege.ending,
  };
}

/** Kurzschlüssel: die Szene wird nur neu gezeichnet, wenn sich etwas Sichtbares ändert. */
export const sceneKey = (m: SceneModel): string => JSON.stringify(m);
