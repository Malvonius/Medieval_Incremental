import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { FALLEN_SOUL_RATE, RESEARCH, RESEARCH_IDS } from "../content/balance";
import { researchStatus } from "./alchemy";
import { exportSave, importSave } from "./persistence";
import { toPlain } from "./serialize";
import { Simulation } from "./simulation";
import { type GameState, createInitialState } from "./state";

const ACT1_2 = [
  "a1_inheritance", "a1_first_serfs", "a1_smith", "a1_first_blade", "a1_ledger", "a1_armory", "a1_grey_banner",
  "a2_council", "a2_first_blood", "a2_confession", "a2_seal", "a2_traitor", "a2_komturei", "a3_descent",
];

function act3Sim(mutate?: (s: GameState) => void): Simulation {
  const state = createInitialState(0);
  for (const tile of ["keep", "forge", "warroom", "dungeon", "crypt", "chronicle"] as const) state.tiles[tile] = true;
  state.flags.act1Complete = true;
  state.flags.act2Complete = true;
  state.story.completed.push(...ACT1_2);
  mutate?.(state);
  return new Simulation(state);
}

describe("Krypta", () => {
  it("Gefallene liefern Seelen", () => {
    const sim = act3Sim((s) => (s.warroom.fallen = 100));
    expect(sim.rates.souls.toNumber()).toBeCloseTo(100 * FALLEN_SOUL_RATE);
    sim.tick(10);
    expect(sim.view.resources.souls.toNumber()).toBeCloseTo(100 * FALLEN_SOUL_RATE * 10);
  });

  it("ohne Krypta strömen keine Seelen", () => {
    const sim = act3Sim((s) => {
      s.tiles.crypt = false;
      s.warroom.fallen = 100;
    });
    expect(sim.rates.souls.eq(0)).toBe(true);
  });

  it("Seelen-Gebäude kosten Seelen, nicht Gold", () => {
    const sim = act3Sim((s) => {
      s.resources.gold = new Decimal(1e12);
      s.resources.souls = new Decimal(10);
    });
    const result = sim.dispatch({ type: "buyBuilding", building: "candle", amount: 1 });
    expect(result).toEqual({ ok: false, reason: "Nicht genug Seelen." });
    expect(sim.view.resources.gold.eq(1e12)).toBe(true);
  });

  it("Pakte multiplizieren die Goldproduktion", () => {
    const sim = act3Sim((s) => {
      s.buildings.serf = 10;
      s.buildings.candle = 5;
      s.resources.souls = new Decimal(1e6);
    });
    const before = sim.rates.gold;
    expect(sim.dispatch({ type: "buyUpgrade", upgrade: "pact_hunger" }).ok).toBe(true);
    expect(sim.rates.gold.div(before).toNumber()).toBeCloseTo(2);
  });
});

describe("Alchemistenturm", () => {
  const withTower = (s: GameState): void => {
    s.tiles.alchemy = true;
    s.resources.gold = new Decimal(1e15);
    s.resources.souls = new Decimal(1e9);
    s.buildings.serf = 10;
  };

  it("respektiert Vorgänger im Forschungsbaum", () => {
    const sim = act3Sim(withTower);
    expect(researchStatus(sim.view, "black_iron")).toBe("locked");
    expect(researchStatus(sim.view, "mercury")).toBe("ready");
    expect(sim.dispatch({ type: "research", research: "black_iron" }).ok).toBe(false);
  });

  it("forscht nacheinander und wendet den Effekt nach Ablauf an", () => {
    const sim = act3Sim(withTower);
    const before = sim.rates.gold;
    expect(sim.dispatch({ type: "research", research: "mercury" }).ok).toBe(true);
    expect(researchStatus(sim.view, "distillate")).toBe("busy");
    expect(sim.rates.gold.eq(before)).toBe(true);

    sim.tick(RESEARCH.mercury.durationSeconds + 0.5);
    expect(sim.view.alchemy.completed.mercury).toBe(true);
    expect(sim.view.alchemy.active).toBeNull();
    expect(sim.rates.gold.div(before).toNumber()).toBeCloseTo(2);
    expect(researchStatus(sim.view, "black_iron")).toBe("ready");
  });

  it("zieht Gold und Seelen beim Start ab", () => {
    const sim = act3Sim(withTower);
    sim.dispatch({ type: "research", research: "distillate" });
    expect(sim.view.resources.souls.eq(new Decimal(1e9).sub(RESEARCH.distillate.souls))).toBe(true);
  });

  it("der Stein der Weisen beendet Akt III", () => {
    const sim = act3Sim((s) => {
      withTower(s);
      s.story.completed.push("a3_first_souls", "a3_alchemist", "a3_first_work", "a3_voice", "a3_glass");
      for (const id of RESEARCH_IDS) s.alchemy.completed[id] = id !== "philosophers_stone";
      s.alchemy.completed.soul_glass = true;
    });
    sim.dispatch({ type: "research", research: "philosophers_stone" });
    sim.tick(RESEARCH.philosophers_stone.durationSeconds + 1);
    expect(sim.view.flags.act3Complete).toBe(true);
  });
});

describe("Forschungsbaum", () => {
  it("ist zyklenfrei und verweist nur auf bekannte Forschungen", () => {
    const state = new Map<string, "visiting" | "done">();
    const visit = (id: (typeof RESEARCH_IDS)[number]): void => {
      if (state.get(id) === "done") return;
      if (state.get(id) === "visiting") throw new Error(`Zyklus bei ${id}`);
      state.set(id, "visiting");
      for (const req of RESEARCH[id].requires) {
        expect(RESEARCH_IDS).toContain(req);
        visit(req);
      }
      state.set(id, "done");
    };
    for (const id of RESEARCH_IDS) visit(id);
  });
});

describe("Speichern mit Akt-III-Daten", () => {
  it("überlebt einen Roundtrip mit laufender Forschung und Seelen", () => {
    const sim = act3Sim((s) => {
      s.tiles.alchemy = true;
      s.resources.gold = new Decimal(1e12);
      s.resources.souls = new Decimal(12_345);
      s.buildings.ossuary = 4;
    });
    sim.dispatch({ type: "research", research: "distillate" });
    sim.tick(30);
    const restored = importSave(exportSave(sim.view), 0);
    expect(toPlain(restored)).toEqual(toPlain(sim.view));
    expect(restored.alchemy.active?.id).toBe("distillate");
  });
});
