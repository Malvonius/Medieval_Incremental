import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

describe("parseSettings", () => {
  it("liefert Standardwerte bei fehlenden oder kaputten Daten", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("kein json")).toEqual(DEFAULT_SETTINGS);
  });

  it("übernimmt gültige und verwirft ungültige Felder einzeln", () => {
    const parsed = parseSettings(JSON.stringify({ notation: "scientific", autosaveSeconds: 7, volume: 2, sound: true }));
    expect(parsed).toEqual({ ...DEFAULT_SETTINGS, notation: "scientific", sound: true });
  });
});
