import { derived } from "svelte/store";
import {
  BUILDINGS,
  type BuildingId,
  ENDINGS,
  type EndingId,
  EXPEDITIONS,
  type ExpeditionId,
  FORTIFICATIONS,
  type FortificationId,
  RECIPES,
  type RecipeId,
  RESEARCH,
  type ResearchId,
  UPGRADES,
  type UpgradeId,
  VOWS,
  type VowId,
  WAVES,
} from "../content/balance";
import { ACHIEVEMENTS, type AchievementId } from "../content/achievements";
import { CHALLENGES, type ChallengeId, DECISIONS, EVENTS, type EventId, SYNERGIES } from "../content/depth";
import type { StoryNode } from "../game/story";
import * as EN from "./content.en";
import { type Locale, locale } from "./index";

interface Named {
  readonly name: string;
  readonly description: string;
}

/** Wählt die Übersetzung, fällt bei fehlendem Eintrag auf das deutsche Original zurück. */
const pick = <T>(lang: Locale, de: T, en: T | undefined): T => (lang === "en" && en !== undefined ? en : de);

/** Spieltexte in der aktiven Sprache. Im Template: {$loc.building(id).name} */
export const loc = derived(locale, (lang) => ({
  story: (node: StoryNode): { title: string; text: readonly string[] } => pick(lang, node, EN.STORY_EN[node.id]),
  building: (id: BuildingId): Named => pick(lang, BUILDINGS[id], EN.BUILDINGS_EN[id]),
  upgrade: (id: UpgradeId): Named => pick(lang, UPGRADES[id], EN.UPGRADES_EN[id]),
  research: (id: ResearchId): Named => pick(lang, RESEARCH[id], EN.RESEARCH_EN[id]),
  expedition: (id: ExpeditionId): Named => pick(lang, EXPEDITIONS[id], EN.EXPEDITIONS_EN[id]),
  fortification: (id: FortificationId): Named => pick(lang, FORTIFICATIONS[id], EN.FORTIFICATIONS_EN[id]),
  wave: (index: number): string => pick(lang, WAVES[index]?.name ?? "", EN.WAVES_EN[index]),
  vow: (id: VowId): { name: string; blessing: string; curse: string } => pick(lang, VOWS[id], EN.VOWS_EN[id]),
  recipe: (id: RecipeId): Named => pick(lang, RECIPES[id], EN.RECIPES_EN[id]),
  ending: (id: EndingId): Named => pick(lang, ENDINGS[id], EN.ENDINGS_EN[id]),
  event: (id: EventId): { title: string; text: string; choices: readonly string[] } =>
    pick(lang, { title: EVENTS[id].title, text: EVENTS[id].text, choices: EVENTS[id].choices.map((c) => c.label) }, EN.EVENTS_EN[id]),
  challenge: (id: ChallengeId): { name: string; description: string; rewardText: string } => pick(lang, CHALLENGES[id], EN.CHALLENGES_EN[id]),
  synergy: (index: number): Named => pick(lang, SYNERGIES[index] ?? { name: "", description: "" }, EN.SYNERGIES_EN[index]),
  trust: (): { title: string; text: string; options: readonly string[] } =>
    pick(lang, { title: DECISIONS.trust.title, text: DECISIONS.trust.text, options: DECISIONS.trust.options.map((o) => o.label) }, EN.DECISION_TRUST_EN),
  achievement: (id: AchievementId): Named => pick(lang, ACHIEVEMENTS[id], EN.ACHIEVEMENTS_EN[id]),
}));
