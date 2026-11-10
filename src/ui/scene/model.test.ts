import { describe, expect, it } from "vitest";
import { createInitialState } from "../../game/state";
import { MAX_HOUSES, sceneModel } from "./model";

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

  it("brennt nach dem Ritual und zeigt das Totenheer während der Belagerung", () => {
    const s = createInitialState(0);
    s.ritual.performed = 1;
    s.flags.act4Complete = true;
    s.siege.wave = 2;
    expect(sceneModel(s)).toMatchObject({ burning: true, act: 2, dead: 16 });
  });
});
