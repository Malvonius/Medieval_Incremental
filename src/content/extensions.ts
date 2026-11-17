import type { UpgradeEffect } from "./balance";
import type { ResourceId } from "./ids";

/** Zweisprachiger Text für die Erweiterungssysteme (Deutsch ist Original und Rückfall). */
export interface Bi {
  readonly de: string;
  readonly en: string;
}

// ── Automatisierung ───────────────────────────────────────────────────────────

export const AUTOMATOR_IDS = ["upgrades", "buildings", "forge", "recruit"] as const;
export type AutomatorId = (typeof AUTOMATOR_IDS)[number];

export interface AutomatorDef {
  readonly name: Bi;
  /** Nötige Rituale der Asche in diesem Spiel (Talent „Ewige Hände“ hebt das auf). */
  readonly rituals: number;
}

export const AUTOMATORS: Readonly<Record<AutomatorId, AutomatorDef>> = {
  upgrades: { name: { de: "Aschenschreiber (Verbesserungen)", en: "Ash Scribe (upgrades)" }, rituals: 1 },
  buildings: { name: { de: "Aschenbaumeister (alle Gebäude)", en: "Ash Builder (all buildings)" }, rituals: 1 },
  forge: { name: { de: "Glutgeselle (Schmiede-Warteschlange)", en: "Ember Journeyman (forge queue)" }, rituals: 2 },
  recruit: { name: { de: "Werber der Asche (Soldaten)", en: "Ash Recruiter (soldiers)" }, rituals: 3 },
};
export const AUTOMATION_INTERVAL = 1;
export const AUTOMATION_MAX_BUYS = 25;
/** Standard-Schwelle: kaufen, wenn die Kosten höchstens 10 % des Vorrats betragen. */
export const AUTOMATION_DEFAULT_THRESHOLD = 0.1;

// ── Aufstieg & Talentbaum (Glut) ─────────────────────────────────────────────

export interface TalentDef {
  readonly name: Bi;
  readonly description: Bi;
  readonly cost: number;
  readonly requires: readonly TalentKey[];
  readonly effects: readonly UpgradeEffect[];
  /** Sonderwirkung außerhalb des Effektindex. */
  readonly special?: "automation" | "offline";
  /** Position im Baum (Spalte, Zeile) für die Darstellung. */
  readonly pos: readonly [number, number];
}

type TalentKey = "spark" | "hands" | "vigil" | "goldGlow" | "faithGlow" | "ironGlow" | "soulGlow" | "warband" | "devotion" | "crown";

const allResources = (factor: number): UpgradeEffect[] =>
  (["gold", "iron", "swords", "souls", "faith"] as const).map((resource) => ({ kind: "resourceMult", resource, factor }));

export const TALENTS: Readonly<Record<TalentKey, TalentDef>> = {
  spark: { name: { de: "Funke", en: "Spark" }, description: { de: "Klicks ×3.", en: "Clicks ×3." }, cost: 1, requires: [], effects: [{ kind: "clickMult", factor: 3 }], pos: [1, 0] },
  hands: { name: { de: "Ewige Hände", en: "Eternal Hands" }, description: { de: "Alle Aschen-Automaten sind sofort verfügbar.", en: "All ash automators are available at once." }, cost: 1, requires: ["spark"], effects: [], special: "automation", pos: [0, 1] },
  vigil: { name: { de: "Ewige Wacht", en: "Eternal Vigil" }, description: { de: "Offline-Fortschritt mit 100 % Effizienz und doppelter Obergrenze.", en: "Offline progress at 100 % efficiency and double the cap." }, cost: 2, requires: ["spark"], effects: [], special: "offline", pos: [2, 1] },
  goldGlow: { name: { de: "Glutgold", en: "Ember Gold" }, description: { de: "Gold ×2.", en: "Gold ×2." }, cost: 2, requires: ["spark"], effects: [{ kind: "resourceMult", resource: "gold", factor: 2 }], pos: [1, 1] },
  ironGlow: { name: { de: "Schmiedeglut", en: "Forge Ember" }, description: { de: "Eisen ×2, Schwerter ×2.", en: "Iron ×2, swords ×2." }, cost: 2, requires: ["goldGlow"], effects: [{ kind: "resourceMult", resource: "iron", factor: 2 }, { kind: "resourceMult", resource: "swords", factor: 2 }], pos: [0, 2] },
  faithGlow: { name: { de: "Heilige Glut", en: "Holy Ember" }, description: { de: "Glauben ×2.", en: "Faith ×2." }, cost: 2, requires: ["goldGlow"], effects: [{ kind: "resourceMult", resource: "faith", factor: 2 }], pos: [2, 2] },
  soulGlow: { name: { de: "Seelenfeuer", en: "Soulfire" }, description: { de: "Seelen ×2.", en: "Souls ×2." }, cost: 3, requires: ["goldGlow"], effects: [{ kind: "resourceMult", resource: "souls", factor: 2 }], pos: [1, 2] },
  warband: { name: { de: "Aschenschar", en: "Ash Warband" }, description: { de: "+1 Expeditionsplatz, Wehrkraft ×1,5.", en: "+1 expedition slot, defense ×1.5." }, cost: 3, requires: ["ironGlow"], effects: [{ kind: "expeditionSlots", add: 1 }, { kind: "defenseMult", factor: 1.5 }], pos: [0, 3] },
  devotion: { name: { de: "Glühende Andacht", en: "Glowing Devotion" }, description: { de: "+1 Gelübdeplatz.", en: "+1 vow slot." }, cost: 4, requires: ["faithGlow", "soulGlow"], effects: [{ kind: "vowSlots", add: 1 }], pos: [2, 3] },
  crown: { name: { de: "Glutkrone", en: "Ember Crown" }, description: { de: "Alle Ressourcen ×1,5.", en: "All resources ×1.5." }, cost: 6, requires: ["warband", "devotion"], effects: allResources(1.5), pos: [1, 4] },
};
export type TalentId = TalentKey;
export const TALENT_IDS = Object.keys(TALENTS) as TalentId[];

// ── Fraktionen & Ruf ─────────────────────────────────────────────────────────

export const FACTION_IDS = ["church", "nobility", "people"] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export interface FactionDef {
  readonly name: Bi;
  /** Wer zu dieser Fraktion hält, verärgert die Rivalen. */
  readonly rival: FactionId;
  readonly courtCost: number;
  readonly boon: UpgradeEffect;
  readonly boonText: Bi;
  readonly curse: UpgradeEffect;
  readonly curseText: Bi;
}

export const REPUTATION_MIN = -100;
export const REPUTATION_MAX = 100;
export const REPUTATION_BOON = 50;
export const REPUTATION_CURSE = -50;
export const COURT_GAIN = 10;
export const COURT_RIVAL_LOSS = 5;
export const COURT_GROWTH = 1.6;

export const FACTIONS: Readonly<Record<FactionId, FactionDef>> = {
  church: {
    name: { de: "Kirche", en: "Church" },
    rival: "nobility",
    courtCost: 2_000,
    boon: { kind: "resourceMult", resource: "faith", factor: 1.3 },
    boonText: { de: "Glauben ×1,3", en: "Faith ×1.3" },
    curse: { kind: "resourceMult", resource: "faith", factor: 0.8 },
    curseText: { de: "Glauben ×0,8", en: "Faith ×0.8" },
  },
  nobility: {
    name: { de: "Adel", en: "Nobility" },
    rival: "people",
    courtCost: 3_000,
    boon: { kind: "resourceMult", resource: "gold", factor: 1.25 },
    boonText: { de: "Gold ×1,25", en: "Gold ×1.25" },
    curse: { kind: "resourceMult", resource: "gold", factor: 0.85 },
    curseText: { de: "Gold ×0,85", en: "Gold ×0.85" },
  },
  people: {
    name: { de: "Volk", en: "Common Folk" },
    rival: "church",
    courtCost: 1_500,
    boon: { kind: "resourceMult", resource: "iron", factor: 1.25 },
    boonText: { de: "Eisen ×1,25", en: "Iron ×1.25" },
    curse: { kind: "clickMult", factor: 0.5 },
    curseText: { de: "Klicks ×0,5", en: "Clicks ×0.5" },
  },
};

/** Rufänderung durch bestehende Entscheidungen (Flag → Deltas). */
export const DECISION_REPUTATION: Readonly<Partial<Record<string, Partial<Record<FactionId, number>>>>> = {
  trustSera: { nobility: 15, church: 10 },
  trustIlse: { people: 10, church: -20 },
};

// ── Gefolge & Ämter ──────────────────────────────────────────────────────────

/** Jedes Amt verstärkt eine Ressource. */
export const OFFICE_IDS = ["bailiff", "minemaster", "armsmaster", "gravedigger", "chaplain"] as const;
export type OfficeId = (typeof OFFICE_IDS)[number];

export const OFFICES: Readonly<Record<OfficeId, { readonly name: Bi; readonly resource: ResourceId }>> = {
  bailiff: { name: { de: "Vogt", en: "Bailiff" }, resource: "gold" },
  minemaster: { name: { de: "Bergmeister", en: "Mine Master" }, resource: "iron" },
  armsmaster: { name: { de: "Waffenmeister", en: "Master-at-Arms" }, resource: "swords" },
  gravedigger: { name: { de: "Totengräber", en: "Gravedigger" }, resource: "souls" },
  chaplain: { name: { de: "Kaplan", en: "Chaplain" }, resource: "faith" },
};

export interface RetainerDef {
  readonly name: string;
  readonly trait: Bi;
  /** Im Wunschamt zählt jede Stufe doppelt. */
  readonly affinity: OfficeId;
  readonly hireCost: number;
}

export const RETAINERS = {
  gunther: { name: "Gunther der Krumme", trait: { de: "Pfennigfuchser", en: "Penny-pincher" }, affinity: "bailiff", hireCost: 1_000 },
  hedda: { name: "Hedda Eisenhand", trait: { de: "Erzschnüfflerin", en: "Ore-sniffer" }, affinity: "minemaster", hireCost: 5_000 },
  ruprecht: { name: "Ruprecht von Hagen", trait: { de: "Klingennarr", en: "Blade fanatic" }, affinity: "armsmaster", hireCost: 25_000 },
  mechthild: { name: "Mutter Mechthild", trait: { de: "Spricht mit Toten", en: "Talks to the dead" }, affinity: "gravedigger", hireCost: 200_000 },
  anselm: { name: "Bruder Anselm", trait: { de: "Predigt im Schlaf", en: "Preaches in his sleep" }, affinity: "chaplain", hireCost: 1_000_000 },
  wendel: { name: "Wendel der Wanderer", trait: { de: "Kann alles ein bisschen", en: "Jack of all trades" }, affinity: "bailiff", hireCost: 50_000_000 },
} as const satisfies Record<string, RetainerDef>;
export type RetainerId = keyof typeof RETAINERS;
export const RETAINER_IDS = Object.keys(RETAINERS) as RetainerId[];

export const RETAINER_MAX_LEVEL = 10;
export const RETAINER_LEVEL_GROWTH = 3;
export const RETAINER_LEVEL_BONUS = 0.04;
export const RETAINER_EQUIP_SWORDS = 50;
export const RETAINER_EQUIP_FACTOR = 1.5;

// ── Ländereien (Karte) ───────────────────────────────────────────────────────

export const TERRAIN_IDS = ["keep", "field", "mine", "forest", "barrow", "shrine"] as const;
export type TerrainId = (typeof TERRAIN_IDS)[number];

export const TERRAINS: Readonly<Record<TerrainId, { readonly name: Bi; readonly glyph: string; readonly resource: ResourceId | null }>> = {
  keep: { name: { de: "Vhal", en: "Vhal" }, glyph: "♜", resource: null },
  field: { name: { de: "Acker", en: "Fields" }, glyph: "ᚚ", resource: "gold" },
  mine: { name: { de: "Stollen", en: "Mine" }, glyph: "⛏", resource: "iron" },
  forest: { name: { de: "Schwarzforst", en: "Black Forest" }, glyph: "♣", resource: "swords" },
  barrow: { name: { de: "Hügelgrab", en: "Barrow" }, glyph: "☗", resource: "souls" },
  shrine: { name: { de: "Wegkreuz", en: "Wayside Shrine" }, glyph: "✝", resource: "faith" },
};

/** 5×5-Gitter, Zeile für Zeile; die Burg liegt in der Mitte. */
const LAYOUT = "fmFbs" + "sffmF" + "bmKfs" + "Ffsmb" + "mbFfF";
const CODE: Readonly<Record<string, TerrainId>> = { K: "keep", f: "field", m: "mine", F: "forest", b: "barrow", s: "shrine" };
export const MAP_SIZE = 5;
export const MAP: readonly TerrainId[] = [...LAYOUT].map((c) => {
  const terrain = CODE[c];
  if (terrain === undefined) throw new Error(`Unbekanntes Kartenzeichen ${c}`);
  return terrain;
});
export const MAP_CENTER = 12;
export const MAP_BASE_STRENGTH = 15;
export const MAP_STRENGTH_GROWTH = 1.8;
export const MAP_LOSS_RATE = 0.25;
export const MAP_TILE_BONUS = 0.08;

// ── Werkstatt-Kette ──────────────────────────────────────────────────────────

export const STATION_IDS = ["mine", "smelter", "smithy"] as const;
export type StationId = (typeof STATION_IDS)[number];

export interface StationDef {
  readonly name: Bi;
  readonly input: Bi | null;
  readonly output: Bi;
  /** Durchsatz pro Stufe und Sekunde (Ausgabeeinheiten). */
  readonly perLevel: number;
  /** Eingabe je Ausgabeeinheit. */
  readonly ratio: number;
  readonly baseCost: number;
}

export const STATIONS: Readonly<Record<StationId, StationDef>> = {
  mine: { name: { de: "Erzgrube", en: "Ore Pit" }, input: null, output: { de: "Erz", en: "Ore" }, perLevel: 1, ratio: 0, baseCost: 200 },
  smelter: { name: { de: "Schmelzofen", en: "Smelter" }, input: { de: "Erz", en: "Ore" }, output: { de: "Barren", en: "Ingots" }, perLevel: 0.4, ratio: 2, baseCost: 600 },
  smithy: { name: { de: "Klingenschmiede", en: "Bladesmith" }, input: { de: "Barren", en: "Ingots" }, output: { de: "Klingen", en: "Blades" }, perLevel: 0.1, ratio: 3, baseCost: 2_000 },
};
export const STATION_COST_GROWTH = 1.5;
/** Jede fertige Meisterklinge landet als Schwerter in der Waffenkammer. */
export const SWORDS_PER_BLADE = 4;

// ── Weitere Enden ────────────────────────────────────────────────────────────

/** Ruf, den alle Fraktionen für das geheime Ende der Eintracht brauchen. */
export const CONCORD_REPUTATION = 60;

// ── Kodex ────────────────────────────────────────────────────────────────────

export interface CodexEntry {
  readonly title: Bi;
  readonly text: Bi;
}

export const CODEX = {
  vhal: { title: { de: "Vhal", en: "Vhal" }, text: { de: "Eine Burg am Rand der Karte, wo die Karte selbst sich nicht mehr hinwagt. Früher berühmt für Wolle, heute für Asche.", en: "A castle at the edge of the map, where the map itself no longer dares to go. Once famous for wool, now for ash." } },
  brannoc: { title: { de: "Meister Brannoc", en: "Master Brannoc" }, text: { de: "Schmied, Witwer, Pessimist. Er behauptet, jedes Schwert habe eine Seele. Die meisten hätten eine schlechte.", en: "Smith, widower, pessimist. He claims every sword has a soul. Most of them, he says, have a bad one." } },
  greyorder: { title: { de: "Der Graue Orden", en: "The Grey Order" }, text: { de: "Ritter, die schworen, die Toten zu bewachen. Irgendwann bewachten die Toten sie.", en: "Knights who swore to guard the dead. At some point the dead started guarding them." } },
  dungeon: { title: { de: "Das Kerkerbuch", en: "The Dungeon Ledger" }, text: { de: "Jeder Gefangene bekommt eine Zeile. Manche Zeilen sind sehr kurz.", en: "Every prisoner gets a line. Some lines are very short." } },
  crypt: { title: { de: "Die Krypta", en: "The Crypt" }, text: { de: "Die Toten von Vhal liegen hier in Reihen. Sie liegen nicht immer still.", en: "The dead of Vhal lie here in rows. They do not always lie still." } },
  ilse: { title: { de: "Ilse Varn", en: "Ilse Varn" }, text: { de: "Alchemistin aus Grauweiler. Zweimal verbannt, einmal verbrannt, beide Male zu Unrecht – sagt sie.", en: "Alchemist from Grauweiler. Banished twice, burnt once, wrongly every time – or so she says." } },
  bell: { title: { de: "Die Glocke", en: "The Bell" }, text: { de: "Gegossen aus dem Erz eines gefallenen Sterns. Sie schweigt, bis jemand an etwas glaubt.", en: "Cast from the ore of a fallen star. It keeps silent until someone believes in something." } },
  ash: { title: { de: "Asche", en: "Ash" }, text: { de: "Was das Feuer übrig lässt, erinnert sich. Mehr muss man über Asche nicht wissen.", en: "What the fire leaves behind remembers. That is all one needs to know about ash." } },
  bishop: { title: { de: "Der Bischof", en: "The Bishop" }, text: { de: "Er predigte vom ewigen Leben und meinte es leider wörtlich.", en: "He preached eternal life and, sadly, meant it literally." } },
  events: { title: { de: "Launen des Landes", en: "Whims of the Land" }, text: { de: "Ernten, Seuchen, Händler, Pilger. Das Land würfelt, und du zahlst.", en: "Harvests, plagues, merchants, pilgrims. The land rolls the dice, and you pay." } },
  retinue: { title: { de: "Das Gefolge", en: "The Retinue" }, text: { de: "Ein Herr ist nur so gut wie die Leute, die er bezahlt. Und die, die er nicht bezahlt, sind meist besser informiert.", en: "A lord is only as good as the people he pays. The ones he doesn't pay are usually better informed." } },
  lands: { title: { de: "Die Ländereien", en: "The Lands" }, text: { de: "Jeder Acker hat einen Besitzer. Manche wissen es noch nicht.", en: "Every field has an owner. Some of them don't know it yet." } },
  factions: { title: { de: "Kirche, Adel, Volk", en: "Church, Nobility, Folk" }, text: { de: "Drei Mächte, die sich gegenseitig nicht leiden können. Wer allen gefällt, hat entweder gelogen oder ein Wunder vollbracht.", en: "Three powers that cannot stand each other. Whoever pleases all three has either lied or worked a miracle." } },
  ember: { title: { de: "Die Glut", en: "The Ember" }, text: { de: "Unter der Asche glüht etwas weiter. Es ist geduldig. Es hat dich schon oft brennen sehen.", en: "Beneath the ash something keeps glowing. It is patient. It has watched you burn many times." } },
  concord: { title: { de: "Die Eintracht", en: "The Concord" }, text: { de: "Einmal in tausend Jahren sitzen Bischof, Graf und Bauer an einem Tisch. Meist, um sich um die Rechnung zu streiten.", en: "Once in a thousand years bishop, count and peasant sit at one table. Usually to argue over the bill." } },
  awakening: { title: { de: "Das Erwachen", en: "The Awakening" }, text: { de: "Wer jedes Ende gesehen hat, sieht auch, was dahinter liegt: einen Anfang, der sich nicht wiederholt.", en: "Whoever has seen every ending also sees what lies behind them: a beginning that does not repeat." } },
} as const satisfies Record<string, CodexEntry>;
export type CodexId = keyof typeof CODEX;
export const CODEX_IDS = Object.keys(CODEX) as CodexId[];

// ── Kosmetik ─────────────────────────────────────────────────────────────────

export const SCHEME_IDS = ["ember", "frost", "blood", "gilded", "grave"] as const;
export type SchemeId = (typeof SCHEME_IDS)[number];
/** Nötige Erfolge für jedes Farbschema. */
export const SCHEMES: Readonly<Record<SchemeId, { readonly name: Bi; readonly achievements: number }>> = {
  ember: { name: { de: "Glut (Standard)", en: "Ember (default)" }, achievements: 0 },
  frost: { name: { de: "Frost", en: "Frost" }, achievements: 3 },
  blood: { name: { de: "Blutmond", en: "Blood Moon" }, achievements: 6 },
  gilded: { name: { de: "Vergoldet", en: "Gilded" }, achievements: 10 },
  grave: { name: { de: "Grabesstille", en: "Grave Silence" }, achievements: 15 },
};

export const TINCTURES = ["#b32d2e", "#2a4f9e", "#2f7a3b", "#1c1c1c", "#6b2f86", "#d9b44a", "#e8e4d8"] as const;
export const DIVISIONS = ["plain", "pale", "fess", "bend", "quarterly", "chevron"] as const;
export const CHARGES = ["none", "tower", "sword", "skull", "cross", "flame", "crown"] as const;
export type Division = (typeof DIVISIONS)[number];
export type Charge = (typeof CHARGES)[number];
/** Freizuschaltende Wappenbilder: Index in CHARGES → nötige Erfolge. */
export const CHARGE_ACHIEVEMENTS: Readonly<Record<Charge, number>> = { none: 0, tower: 0, sword: 2, skull: 5, cross: 8, flame: 12, crown: 16 };
