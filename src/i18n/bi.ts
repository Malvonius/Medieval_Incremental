import { derived } from "svelte/store";
import type { Bi } from "../content/extensions";
import { locale } from "./index";

/** Zweisprachige Erweiterungstexte in der aktiven Sprache. Im Template: {$bi(def.name)} */
export const bi = derived(locale, (lang) => (text: Bi): string => text[lang]);
