import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { encodeSave } from "../core/save";
import { EXPEDITIONS, RECRUIT_SWORDS } from "../content/balance";
import { exportSave, importSave } from "./persistence";
import { expeditionDuration, expeditionLosses, recruitCost } from "./rates";
import { toPlain } from "./serialize";
import { Simulation } from "./simulation";
import { type GameState, SAVE_VERSION, aliveSoldiers, createInitialState } from "./state";
import { launchBlocker, maxRecruitable } from "./warroom";

function act2Sim(mutate?: (s: GameState) => void): Simulation {
  const state = createInitialState(0);
  state.tiles.keep = true;
  state.tiles.forge = true;
  state.tiles.warroom = true;
  state.flags.act1Complete = true;
  state.story.completed.push("a1_inheritance", "a1_first_serfs", "a1_smith", "a1_first_blade", "a1_ledger", "a1_armory", "a1_grey_banner", "a2_council");
  mutate?.(state);
  return new Simulation(state);
}

const rich = (s: GameState): void => {
  s.resources.gold = new Decimal(1e12);
  s.resources.swords = new Decimal(500);
};

describe("Kriegsrat: Rekrutierung", () => {
  it("verbraucht Gold und Schwerter", () => {
    const sim = act2Sim(rich);
    const cost = recruitCost(sim.view, 10);
    expect(sim.dispatch({ type: "recruit", amount: 10 }).ok).toBe(true);
    expect(sim.view.warroom.soldiers).toBe(10);
    expect(sim.view.resources.swords.eq(500 - 10 * RECRUIT_SWORDS)).toBe(true);
    expect(sim.view.resources.gold.eq(new Decimal(1e12).sub(cost))).toBe(true);
  });

  it("ist durch Schwerter begrenzt", () => {
    const sim = act2Sim((s) => {
      rich(s);
      s.resources.swords = new Decimal(3);
    });
    expect(maxRecruitable(sim.view)).toBe(3);
    expect(sim.dispatch({ type: "recruit", amount: 4 }).ok).toBe(false);
  });

  it("Soldaten erhöhen die Goldproduktion wie Schwerter", () => {
    const sim = act2Sim((s) => {
      rich(s);
      s.buildings.serf = 10;
    });
    const before = sim.rates.gold;
    sim.dispatch({ type: "recruit", amount: 10 });
    // 10 Schwerter wurden zu 10 Soldaten: Bonus bleibt gleich.
    expect(sim.rates.gold.eq(before)).toBe(true);
  });
});

describe("Kriegsrat: Expeditionen", () => {
  it("blockiert unbekannte Ziele und fehlende Soldaten", () => {
    const sim = act2Sim(rich);
    expect(launchBlocker(sim.view, "outpost")).toBe("locked");
    expect(launchBlocker(sim.view, "bandits")).toBe("soldiers");
  });

  it("kehrt mit Beute und Verlusten zurück", () => {
    const sim = act2Sim((s) => {
      rich(s);
      s.buildings.serf = 10;
      s.warroom.soldiers = 30;
    });
    const def = EXPEDITIONS.toll_fort;
    expect(sim.dispatch({ type: "launchExpedition", expedition: "toll_fort" }).ok).toBe(true);
    expect(sim.view.warroom.soldiers).toBe(30 - def.soldiers);
    expect(aliveSoldiers(sim.view)).toBe(30);
    expect(launchBlocker(sim.view, "bandits")).toBe("slots"); // 5 übrig, aber kein freier Hauptmann

    const goldBefore = sim.view.resources.gold;
    sim.tick(expeditionDuration(sim.view, "toll_fort") + 1);
    const lost = expeditionLosses(sim.view, "toll_fort", def.soldiers);
    expect(sim.view.warroom.active).toHaveLength(0);
    expect(sim.view.warroom.soldiers).toBe(30 - lost);
    expect(sim.view.warroom.fallen).toBe(lost);
    expect(sim.view.warroom.completed.toll_fort).toBe(1);
    expect(sim.view.dungeon.prisoners).toBe(def.reward.prisoners);
    expect(sim.view.resources.gold.gt(goldBefore)).toBe(true);
  });

  it("die Komturei fällt nur einmal", () => {
    const sim = act2Sim((s) => {
      rich(s);
      s.flags.komtureiKnown = true;
      s.warroom.soldiers = 1_000;
      s.warroom.completed.komturei = 1;
    });
    expect(launchBlocker(sim.view, "komturei")).toBe("done");
  });
});

describe("Kerker", () => {
  const withPrisoners = (s: GameState): void => {
    s.tiles.dungeon = true;
    s.dungeon.prisoners = 5;
  };

  it("Verhöre bringen Hinweise", () => {
    const sim = act2Sim(withPrisoners);
    expect(sim.dispatch({ type: "interrogate", amount: 3 }).ok).toBe(true);
    expect(sim.view.dungeon).toMatchObject({ prisoners: 2, intel: 3, interrogated: 3 });
    expect(sim.dispatch({ type: "interrogate", amount: 3 }).ok).toBe(false);
  });

  it("Fronarbeit erhöht die Eisenproduktion", () => {
    const sim = act2Sim((s) => {
      withPrisoners(s);
      s.buildings.mine = 5;
    });
    const before = sim.rates.iron;
    expect(sim.dispatch({ type: "forceLabor", amount: 5 }).ok).toBe(true);
    expect(sim.rates.iron.gt(before)).toBe(true);
  });

  it("verweigert Aktionen bei verschlossenem Kerker", () => {
    const sim = act2Sim((s) => (s.dungeon.prisoners = 5));
    expect(sim.dispatch({ type: "interrogate", amount: 1 }).ok).toBe(false);
  });
});

describe("Story Akt II", () => {
  it("Hinweise aus Verhören schalten den Vorposten frei", () => {
    const sim = act2Sim((s) => {
      s.tiles.dungeon = true;
      s.warroom.completed.bandits = 1;
      s.dungeon.prisoners = 10;
    });
    sim.tick(0.1);
    expect(sim.view.story.completed).toContain("a2_first_blood");
    sim.dispatch({ type: "interrogate", amount: 10 });
    expect(sim.view.flags.outpostKnown).toBe(true);
    expect(launchBlocker(sim.view, "outpost")).toBe("soldiers");
  });
});

describe("Speichern mit Akt-II-Daten", () => {
  it("überlebt einen Roundtrip inklusive laufender Expedition", () => {
    const sim = act2Sim((s) => {
      rich(s);
      s.warroom.soldiers = 30;
      s.tiles.dungeon = true;
      s.dungeon.prisoners = 4;
      s.dungeon.laborers = 2;
      s.warroom.seals = 3;
    });
    sim.dispatch({ type: "launchExpedition", expedition: "toll_fort" });
    sim.tick(10);
    const restored = importSave(exportSave(sim.view), 0);
    expect(toPlain(restored)).toEqual(toPlain(sim.view));
  });

  it("lädt Spielstände aus Akt I ohne Akt-II-Felder", () => {
    const state = createInitialState(0);
    const plain: Record<string, unknown> = { ...toPlain(state) };
    delete plain["warroom"];
    delete plain["dungeon"];
    const restored = importSave(encodeSave(plain, SAVE_VERSION), 0);
    expect(restored.warroom.soldiers).toBe(0);
    expect(restored.dungeon.intel).toBe(0);
  });
});
