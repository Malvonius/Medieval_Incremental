import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { encodeSave } from "../core/save";
import { ASH_BONUS, ASH_GOLD_BASE, REBIRTH_RUN_GOLD, VOWS } from "../content/balance";
import { vowBlocker } from "./chapel";
import { exportSave, importSave } from "./persistence";
import { ashGain, goldForNextAsh } from "./ritual";
import { toPlain } from "./serialize";
import { Simulation } from "./simulation";
import { type GameState, SAVE_VERSION, createInitialState } from "./state";

const DONE_BEFORE_ACT4 = [
  "a1_inheritance", "a1_first_serfs", "a1_smith", "a1_first_blade", "a1_ledger", "a1_armory", "a1_grey_banner",
  "a2_council", "a2_first_blood", "a2_confession", "a2_seal", "a2_traitor", "a2_komturei",
  "a3_descent", "a3_first_souls", "a3_alchemist", "a3_first_work", "a3_voice", "a3_glass", "a3_stone", "a4_mass",
];

function act4Sim(mutate?: (s: GameState) => void): Simulation {
  const state = createInitialState(0);
  for (const tile of ["keep", "forge", "warroom", "dungeon", "crypt", "alchemy", "chapel", "chronicle"] as const) {
    state.tiles[tile] = true;
  }
  for (const flag of ["act1Complete", "outpostKnown", "komtureiKnown", "act2Complete", "act3Complete"] as const) {
    state.flags[flag] = true;
  }
  state.story.completed.push(...DONE_BEFORE_ACT4);
  mutate?.(state);
  return new Simulation(state);
}

describe("Kapelle: Gelübde", () => {
  it("kosten Glauben und belegen einen Altar", () => {
    const sim = act4Sim((s) => (s.resources.faith = new Decimal(1e6)));
    expect(sim.dispatch({ type: "swearVow", vow: "penance" }).ok).toBe(true);
    expect(sim.view.resources.faith.eq(1e6 - VOWS.penance.faithCost)).toBe(true);
    expect(vowBlocker(sim.view, "sword")).toBe("slots");
    expect(sim.dispatch({ type: "swearVow", vow: "sword" }).ok).toBe(false);
  });

  it("wirken als Segen und Fluch zugleich", () => {
    const sim = act4Sim((s) => {
      s.resources.faith = new Decimal(1e6);
      s.buildings.offering_box = 10;
      s.buildings.mine = 10;
    });
    const faith = sim.rates.faith;
    const iron = sim.rates.iron;
    sim.dispatch({ type: "swearVow", vow: "penance" });
    expect(sim.rates.faith.div(faith).toNumber()).toBeCloseTo(3);
    expect(sim.rates.iron.div(iron).toNumber()).toBeCloseTo(0.25);
  });

  it("lassen sich brechen, ohne Glauben zurückzugeben", () => {
    const sim = act4Sim((s) => (s.resources.faith = new Decimal(1e6)));
    sim.dispatch({ type: "swearVow", vow: "penance" });
    const faith = sim.view.resources.faith;
    expect(sim.dispatch({ type: "breakVow", vow: "penance" }).ok).toBe(true);
    expect(sim.view.resources.faith.eq(faith)).toBe(true);
    expect(vowBlocker(sim.view, "sword")).toBeNull();
  });

  it("das Gelübde des Schweigens macht Steuern eintreiben wertlos", () => {
    const sim = act4Sim((s) => (s.resources.faith = new Decimal(1e6)));
    sim.dispatch({ type: "swearVow", vow: "silence" });
    const gold = sim.view.resources.gold;
    sim.dispatch({ type: "collect" });
    expect(sim.view.resources.gold.eq(gold)).toBe(true);
  });
});

describe("Ritual der Asche", () => {
  const ready = (s: GameState): void => {
    s.tiles.ritual = true;
    s.runTotals.gold = new Decimal(ASH_GOLD_BASE * 1e4);
    s.totals.gold = s.runTotals.gold;
    s.resources.gold = new Decimal(5e15);
    s.resources.souls = new Decimal(1e9);
    s.resources.faith = new Decimal(12_345);
    s.buildings.mill = 50;
    s.buildings.candle = 20;
    s.upgrades.waterwheel = true;
    s.warroom.soldiers = 100;
    s.warroom.fallen = 80;
    s.warroom.seals = 10;
    s.warroom.completed.komturei = 1;
    s.dungeon.laborers = 30;
    s.dungeon.intel = 24;
    s.alchemy.completed.mercury = true;
    s.chapel.vows.penance = true;
    s.forge.queue.push("sword");
  };

  it("berechnet Asche wurzelförmig aus dem Gold des Laufs", () => {
    const sim = act4Sim((s) => (s.runTotals.gold = new Decimal(ASH_GOLD_BASE * 1e4)));
    expect(ashGain(sim.view)).toBe(15);
    expect(goldForNextAsh(sim.view)).toBeGreaterThan(ASH_GOLD_BASE * 1e4);
  });

  it("verlangt das freigeschaltete Ritual und genug Gold", () => {
    expect(act4Sim().dispatch({ type: "ritual" }).ok).toBe(false);
    expect(act4Sim((s) => (s.tiles.ritual = true)).dispatch({ type: "ritual" }).ok).toBe(false);
  });

  it("verbrennt Vhal und lässt Wissen, Siegel, Glauben und Gelübde stehen", () => {
    const sim = act4Sim(ready);
    expect(sim.dispatch({ type: "ritual" }).ok).toBe(true);
    const v = sim.view;
    expect(v.ritual).toEqual({ ash: 15, performed: 1 });
    expect(v.resources.gold.eq(0)).toBe(true);
    expect(v.resources.souls.eq(0)).toBe(true);
    expect(v.runTotals.gold.eq(0)).toBe(true);
    expect(v.buildings.mill).toBe(0);
    expect(v.buildings.candle).toBe(0);
    expect(v.upgrades.waterwheel).toBe(false);
    expect(v.warroom).toMatchObject({ soldiers: 0, fallen: 80, active: [], seals: 10 });
    expect(v.warroom.completed.komturei).toBe(1);
    expect(v.dungeon).toMatchObject({ laborers: 0, intel: 24 });
    expect(v.forge.queue).toHaveLength(0);
    expect(v.resources.faith.eq(12_345)).toBe(true);
    expect(v.alchemy.completed.mercury).toBe(true);
    expect(v.chapel.vows.penance).toBe(true);
    expect(v.totals.gold.gt(0)).toBe(true);
  });

  it("Asche multipliziert die Produktion", () => {
    const sim = act4Sim((s) => (s.buildings.serf = 10));
    const before = sim.rates.gold;
    const boosted = act4Sim((s) => {
      s.buildings.serf = 10;
      s.ritual.ash = 15;
    });
    expect(boosted.rates.gold.div(before).toNumber()).toBeCloseTo(1 + 15 * ASH_BONUS);
  });

  it("das Ritual löst „Vhal brennt“ aus, Akt IV endet aber erst nach dem Wiederaufbau", () => {
    const sim = act4Sim((s) => {
      ready(s);
      s.story.completed.push("a4_first_faith", "a4_vow", "a4_sermon", "a4_betrayal");
    });
    sim.dispatch({ type: "ritual" });
    expect(sim.view.story.completed).toContain("a4_ashes");
    expect(sim.view.flags.act4Complete).toBe(false);
  });

  it("schließt Akt IV ab, sobald der neue Lauf genug Gold erwirtschaftet", () => {
    const sim = act4Sim((s) => {
      s.tiles.ritual = true;
      s.ritual = { ash: 15, performed: 1 };
      s.runTotals.gold = new Decimal(REBIRTH_RUN_GOLD);
      s.story.completed.push("a4_first_faith", "a4_vow", "a4_sermon", "a4_betrayal", "a4_ashes");
    });
    sim.tick(0.1);
    expect(sim.view.flags.act4Complete).toBe(true);
  });
});

describe("Speichern mit Akt-IV-Daten", () => {
  it("überlebt einen Roundtrip mit Asche, Gelübden und Glauben", () => {
    const sim = act4Sim((s) => {
      s.ritual = { ash: 7, performed: 2 };
      s.chapel.vows.sword = true;
      s.resources.faith = new Decimal(999);
      s.runTotals.gold = new Decimal("3.3e14");
    });
    const restored = importSave(exportSave(sim.view), 0);
    expect(toPlain(restored)).toEqual(toPlain(sim.view));
  });

  it("ältere Spielstände ohne Lauf übernehmen die Gesamtsummen", () => {
    const state = createInitialState(0);
    state.totals.gold = new Decimal(5e13);
    const plain: Record<string, unknown> = { ...toPlain(state) };
    delete plain["runTotals"];
    const restored = importSave(encodeSave(plain, SAVE_VERSION), 0);
    expect(restored.runTotals.gold.eq(5e13)).toBe(true);
  });
});
