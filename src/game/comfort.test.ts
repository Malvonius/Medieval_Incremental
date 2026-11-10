import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { ACHIEVEMENT_BONUS } from "../content/achievements";
import { resolveAmount } from "./actions";
import { hasAffordable } from "./affordable";
import { exportSave, importSave } from "./persistence";
import { Simulation } from "./simulation";
import { createInitialState } from "./state";

const start = (): Simulation => {
  const sim = new Simulation(createInitialState(0));
  sim.tick(1e-3);
  return sim;
};

describe("Erfolge", () => {
  it("werden einmalig vergeben, gemeldet und erhöhen die Produktion", () => {
    const sim = start();
    const earned: string[] = [];
    sim.events.on("achievement", (id) => earned.push(id));
    sim.dispatch({ type: "collect" });
    sim.dispatch({ type: "collect" });
    expect(earned).toEqual(["first_coin"]);
    expect(sim.view.achievements.first_coin).toBe(true);

    const withSerfs = (earnedFirstCoin: boolean): Simulation => {
      const state = createInitialState(0);
      state.buildings.serf = 10;
      state.achievements.first_coin = earnedFirstCoin;
      return new Simulation(state);
    };
    expect(withSerfs(true).rates.gold.div(withSerfs(false).rates.gold).toNumber()).toBeCloseTo(1 + ACHIEVEMENT_BONUS);
  });

  it("überstehen Speichern und Laden", () => {
    const sim = start();
    sim.dispatch({ type: "collect" });
    expect(importSave(exportSave(sim.view), 0).achievements.first_coin).toBe(true);
  });
});

describe("Story-Zeitstempel", () => {
  it("speichern die Spielsekunde jedes Knotens", () => {
    const sim = start();
    sim.dispatch({ type: "collect" });
    sim.tick(5);
    expect(sim.view.story.completedAt).toHaveLength(sim.view.story.completed.length);
  });
});

describe("Kaufmenge →10", () => {
  it.each([
    [0, 10],
    [7, 3],
    [10, 10],
    [23, 7],
  ])("bei %i Besitz %i Stück", (owned, expected) => {
    expect(resolveAmount("next", owned, () => 0)).toBe(expected);
  });
});

describe("hasAffordable", () => {
  it("meldet bezahlbare Käufe nur auf freigeschalteten Kacheln", () => {
    const sim = start();
    expect(hasAffordable(sim.view, "keep")).toBe(false);
    const state = createInitialState(0);
    state.tiles.keep = true;
    state.resources.gold = new Decimal(100);
    expect(hasAffordable(new Simulation(state).view, "keep")).toBe(true);
    expect(hasAffordable(new Simulation(state).view, "forge")).toBe(false);
  });
});
