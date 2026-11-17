import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/state";
import { MAX_HOUSES, sceneDynamics, sceneModel } from "./model";

describe("sceneModel", () => {
  it("startet als leere Ruine in Akt I", () => {
    const m = sceneModel(createInitialState(0));
    expect(m).toMatchObject({ act: 1, houses: 0, forge: false, burning: false, dead: 0 });
  });

  it("wächst mit den Gebäuden, aber gedeckelt", () => {
    const s = createInitialState(0);
    s.buildings.serf = 1e6;
    expect(sceneModel(s).houses).toBe(MAX_HOUSES);
  });

  it("regnet bei der Pest und schneit in Akt V", () => {
    const s = createInitialState(0);
    s.events.pending = "plague";
    expect(sceneModel(s).weather).toBe("rain");
    const siege = createInitialState(0);
    siege.flags.act4Complete = true;
    expect(sceneModel(siege).weather).toBe("snow");
    expect(sceneModel(createInitialState(0)).weather).toBe("clear");
  });

  it("brennt nach dem Ritual und zeigt das Totenheer während der Belagerung", () => {
    const s = createInitialState(0);
    s.ritual.performed = 1;
    s.flags.act4Complete = true;
    s.siege.wave = 2;
    expect(sceneModel(s)).toMatchObject({ burning: true, act: 2, dead: 16 });
  });
});

describe("Lebendiges Dorf", () => {
  it("leitet Figuren, Jahreszeit, Händler und Rabe aus dem Spielstand ab", () => {
    const s = createInitialState(0);
    s.tiles.keep = true;
    s.buildings.serf = 100;
    s.warroom.soldiers = 1e6;
    s.dungeon.prisoners = 2;
    s.merchant.present = true;
    s.raven.gift = true;
    s.stats.playSeconds = 3 * 900;
    const m = sceneModel(s);
    expect(m).toMatchObject({ season: "winter", merchant: true, raven: true, ravenGift: true });
    expect(m.peasants).toBeGreaterThan(1);
    expect(m.soldiers).toBe(6);
    expect(m.prisoners).toBeGreaterThan(0);
    expect(sceneModel(createInitialState(0))).toMatchObject({ peasants: 0, soldiers: 0, prisoners: 0 });
  });

  it("meldet den Fortschritt einer Schlacht nur, solange sie läuft", () => {
    const s = createInitialState(0);
    expect(sceneDynamics(s).battle).toBeNull();
    s.flags.act4Complete = true;
    s.siege.battle = { remaining: 0 };
    expect(sceneDynamics(s).battle).toBe(1);
  });
});
