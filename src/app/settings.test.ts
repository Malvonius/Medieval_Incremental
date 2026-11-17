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

describe("Erweiterte Einstellungen", () => {
  it("verwirft doppelte oder Ziffern-Belegungen und ungültige Wappen", () => {
    const parsed = parseSettings(JSON.stringify({ keys: { collect: "x", save: "x", prevTile: "q", nextTile: "e" }, heraldry: { field: 99, charge: "dragon" }, scheme: "neon" }));
    expect(parsed.keys).toEqual(DEFAULT_SETTINGS.keys);
    expect(parsed.heraldry.field).toBe(DEFAULT_SETTINGS.heraldry.field);
    expect(parsed.heraldry.charge).toBe(DEFAULT_SETTINGS.heraldry.charge);
    expect(parsed.scheme).toBe("ember");
    expect(parseSettings(JSON.stringify({ keys: { collect: "1" } })).keys.collect).toBe(" ");
  });

  it("übernimmt gültige Werte", () => {
    const parsed = parseSettings(JSON.stringify({ keys: { collect: "c", save: "s", prevTile: "a", nextTile: "d" }, voice: true, scheme: "frost" }));
    expect(parsed.keys.collect).toBe("c");
    expect(parsed.voice).toBe(true);
    expect(parsed.scheme).toBe("frost");
  });
});
