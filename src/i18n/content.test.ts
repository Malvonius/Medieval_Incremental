import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_IDS } from "../content/achievements";
import { BUILDING_IDS, EXPEDITION_IDS, RESEARCH_IDS, UPGRADE_IDS, VOW_IDS, WAVES } from "../content/balance";
import { CHALLENGE_IDS, EVENTS, EVENT_IDS } from "../content/depth";
import { STORY } from "../content/story";
import * as EN from "./content.en";
import { loc } from "./content";
import { locale } from "./index";

describe("Englische Spieltexte", () => {
  it("sind für jeden Inhalt vollständig vorhanden", () => {
    const missing = [
      ...STORY.filter((n) => !EN.STORY_EN[n.id]).map((n) => `story:${n.id}`),
      ...BUILDING_IDS.filter((id) => !EN.BUILDINGS_EN[id]).map((id) => `building:${id}`),
      ...UPGRADE_IDS.filter((id) => !EN.UPGRADES_EN[id]).map((id) => `upgrade:${id}`),
      ...RESEARCH_IDS.filter((id) => !EN.RESEARCH_EN[id]).map((id) => `research:${id}`),
      ...EXPEDITION_IDS.filter((id) => !EN.EXPEDITIONS_EN[id]).map((id) => `expedition:${id}`),
      ...VOW_IDS.filter((id) => !EN.VOWS_EN[id]).map((id) => `vow:${id}`),
      ...EVENT_IDS.filter((id) => EN.EVENTS_EN[id]?.choices.length !== EVENTS[id].choices.length).map((id) => `event:${id}`),
      ...CHALLENGE_IDS.filter((id) => !EN.CHALLENGES_EN[id]).map((id) => `challenge:${id}`),
      ...ACHIEVEMENT_IDS.filter((id) => !EN.ACHIEVEMENTS_EN[id]).map((id) => `achievement:${id}`),
    ];
    expect(missing).toEqual([]);
    expect(EN.WAVES_EN).toHaveLength(WAVES.length);
  });

  it("wechseln mit der Sprache", () => {
    locale.set("en");
    expect(get(loc).building("serf").name).toBe("Serf");
    locale.set("de");
    expect(get(loc).building("serf").name).toBe("Leibeigener");
  });
});
