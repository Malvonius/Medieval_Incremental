import type { DeepReadonly } from "../core/types";
import type { GameState } from "../game/state";
import { WAVES } from "./balance";

export interface AchievementDef {
  readonly name: string;
  readonly description: string;
  readonly trigger: (s: DeepReadonly<GameState>) => boolean;
  /** Verrät Story-Inhalte: bis zum Erreichen als „???“ angezeigt. */
  readonly secret?: true;
}

/** Jeder Erfolg erhöht Gold, Eisen, Seelen und Glauben um ACHIEVEMENT_BONUS. */
export const ACHIEVEMENT_BONUS = 0.01;

export const ACHIEVEMENTS = {
  first_coin: { name: "Erste Münze", description: "Treibe zum ersten Mal Steuern ein.", trigger: (s) => s.stats.clicks >= 1 },
  tax_collector: { name: "Steuereintreiber", description: "Treibe 1.000-mal Steuern ein.", trigger: (s) => s.stats.clicks >= 1_000 },
  serfs_50: { name: "Herr über Hände", description: "Besitze 50 Leibeigene.", trigger: (s) => s.buildings.serf >= 50 },
  gold_1e6: { name: "Wohlstand", description: "Erwirtschafte insgesamt 1 Mio. Gold.", trigger: (s) => s.totals.gold.gte(1e6) },
  gold_1e9: { name: "Reichtum", description: "Erwirtschafte insgesamt 1 Mrd. Gold.", trigger: (s) => s.totals.gold.gte(1e9) },
  gold_1e12: { name: "Unermesslich", description: "Erwirtschafte insgesamt 1 Bio. Gold.", trigger: (s) => s.totals.gold.gte(1e12) },
  swords_100: { name: "Waffenkammer", description: "Schmiede insgesamt 100 Schwerter.", trigger: (s) => s.totals.swords.gte(100) },
  soldiers_100: { name: "Eine Kompanie", description: "Befehlige 100 Soldaten.", trigger: (s) => s.warroom.soldiers >= 100 },
  seals_10: { name: "Siegelbewahrer", description: "Sammle 10 Ordenssiegel.", trigger: (s) => s.warroom.seals >= 10 },
  fallen_500: { name: "Totengräber", description: "500 Gefallene ruhen in der Krypta.", trigger: (s) => s.warroom.fallen >= 500 },
  laborers_50: { name: "Fronherr", description: "Zwinge 50 Gefangene zur Fron.", trigger: (s) => s.dungeon.laborers >= 50 },
  souls_1e6: { name: "Seelenhirte", description: "Sammle insgesamt 1 Mio. Seelen.", trigger: (s) => s.totals.souls.gte(1e6) },
  all_research: {
    name: "Das große Werk",
    description: "Schließe alle Forschungen ab.",
    trigger: (s) => Object.values(s.alchemy.completed).every(Boolean),
    secret: true,
  },
  faith_1e6: { name: "Glaubensfels", description: "Sammle insgesamt 1 Mio. Glauben.", trigger: (s) => s.totals.faith.gte(1e6) },
  first_ritual: { name: "Aus der Asche", description: "Vollziehe das Ritual der Asche.", secret: true, trigger: (s) => s.ritual.performed >= 1 },
  ash_50: { name: "Phönix", description: "Sammle 50 Asche.", secret: true, trigger: (s) => s.ritual.ash >= 50 },
  siege_won: { name: "Die Mauern halten", description: "Wehre alle Wellen der Belagerung ab.", secret: true, trigger: (s) => s.siege.wave >= WAVES.length },
  ending_light: { name: "Das Licht von Vhal", description: "Erreiche das Licht-Ende.", secret: true, trigger: (s) => s.siege.ending === "light" },
  ending_ash: { name: "Der neue Meister", description: "Erreiche das Asche-Ende.", secret: true, trigger: (s) => s.siege.ending === "ash" },
} as const satisfies Record<string, AchievementDef>;

export type AchievementId = keyof typeof ACHIEVEMENTS;
export const ACHIEVEMENT_IDS = Object.keys(ACHIEVEMENTS) as AchievementId[];
