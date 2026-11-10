import { derived, writable } from "svelte/store";
import { UI_EN } from "./ui.en";

/**
 * Übersetzung der Bedienoberfläche (Kacheln, Ressourcen, Einstellungen).
 * Story- und Spieltexte liegen weiterhin auf Deutsch in content/; für eine
 * Übersetzung werden sie nach demselben Schema in Wörterbücher verschoben.
 */
const de = {
  "tile.keep": "Burgfried",
  "tile.forge": "Schmiede",
  "tile.warroom": "Kriegsrat",
  "tile.dungeon": "Kerker",
  "tile.crypt": "Krypta",
  "tile.alchemy": "Alchemisten­turm",
  "tile.chapel": "Kapelle",
  "tile.ritual": "Ritual der Asche",
  "tile.chronicle": "Chronik",
  "tile.sealed": "Versiegelt",
  "res.gold": "Gold",
  "res.iron": "Eisen",
  "res.swords": "Schwerter",
  "res.soldiers": "Soldaten",
  "res.prisoners": "Gefangene",
  "res.souls": "Seelen",
  "res.faith": "Glauben",
  "res.ash": "Asche",
  "res.seals": "Ordenssiegel",
  "res.defense": "Wehrkraft",
  "settings.title": "Einstellungen",
  "settings.notation": "Zahlenformat",
  "settings.autosave": "Automatisch speichern",
  "settings.motion": "Animationen reduzieren",
  "settings.sound": "Ton",
  "settings.volume": "Lautstärke",
  "settings.language": "Sprache",
} as const;

export type MessageKey = keyof typeof de;
type Dictionary = Readonly<Record<MessageKey, string>>;

const en: Dictionary = {
  "tile.keep": "Keep",
  "tile.forge": "Forge",
  "tile.warroom": "War Council",
  "tile.dungeon": "Dungeon",
  "tile.crypt": "Crypt",
  "tile.alchemy": "Alchemist's Tower",
  "tile.chapel": "Chapel",
  "tile.ritual": "Ritual of Ash",
  "tile.chronicle": "Chronicle",
  "tile.sealed": "Sealed",
  "res.gold": "Gold",
  "res.iron": "Iron",
  "res.swords": "Swords",
  "res.soldiers": "Soldiers",
  "res.prisoners": "Prisoners",
  "res.souls": "Souls",
  "res.faith": "Faith",
  "res.ash": "Ash",
  "res.seals": "Order Seals",
  "res.defense": "Defense",
  "settings.title": "Settings",
  "settings.notation": "Number format",
  "settings.autosave": "Autosave",
  "settings.motion": "Reduce motion",
  "settings.sound": "Sound",
  "settings.volume": "Volume",
  "settings.language": "Language",
};

export const LOCALES = { de: "Deutsch", en: "English" } as const;
export type Locale = keyof typeof LOCALES;
const DICTIONARIES: Readonly<Record<Locale, Dictionary>> = { de, en };

const KEY = "vhal.locale";
const stored = ((): Locale => {
  try {
    const value = globalThis.localStorage?.getItem(KEY);
    return value === "en" || value === "de" ? value : "de";
  } catch {
    return "de";
  }
})();

export const locale = writable<Locale>(stored);
locale.subscribe((value) => {
  try {
    globalThis.localStorage?.setItem(KEY, value);
    if (typeof document !== "undefined") document.documentElement.lang = value;
  } catch {
    // Nur für diese Sitzung.
  }
});

export const translate = (lang: Locale, key: MessageKey): string => DICTIONARIES[lang][key];

/** Im Template: {$t("tile.keep")} */
export const t = derived(locale, (lang) => (key: MessageKey): string => translate(lang, key));

/**
 * Übersetzt einen deutschen Oberflächentext; der deutsche Text ist zugleich der Schlüssel.
 * Fehlt eine Übersetzung, bleibt der deutsche Text stehen. Im Template: {$tx("Weiter")}
 */
export function translateText(lang: Locale, de: string, vars?: Readonly<Record<string, string>>): string {
  const text = lang === "en" ? (UI_EN[de] ?? de) : de;
  return vars ? text.replace(/\{(\w+)\}/g, (match, name: string) => vars[name] ?? match) : text;
}

/** Platzhalter wie {time} werden aus `vars` ersetzt – so bleiben ganze Sätze übersetzbar. */
export const tx = derived(
  locale,
  (lang) =>
    (de: string, vars?: Readonly<Record<string, string>>): string =>
      translateText(lang, de, vars),
);
