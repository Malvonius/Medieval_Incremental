import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { ENDINGS, FORTIFICATIONS, SEAL_BONUS, SOLDIER_DEFENSE, WAVES } from "../content/balance";
import { STORY } from "../content/story";
import { exportSave, importSave } from "./persistence";
import { defense } from "./rates";
import { toPlain } from "./serialize";
import { battleBlocker, endingBlocker, siegeActive } from "./siege";
import { Simulation } from "./simulation";
import { type GameState, createInitialState } from "./state";

const BEFORE_ACT5 = STORY.filter((n) => n.act < 5).map((n) => n.id);

function act5Sim(mutate?: (s: GameState) => void): Simulation {
  const state = createInitialState(0);
  for (const tile of ["keep", "forge", "warroom", "dungeon", "crypt", "alchemy", "chapel", "ritual", "chronicle"] as const) {
    state.tiles[tile] = true;
  }
  for (const flag of ["act1Complete", "outpostKnown", "komtureiKnown", "act2Complete", "act3Complete", "act4Complete"] as const) {
    state.flags[flag] = true;
  }
  state.ritual = { ash: 15, performed: 1 };
  state.story.completed.push(...BEFORE_ACT5, "a5_siege");
  mutate?.(state);
  return new Simulation(state);
}

describe("Belagerung: Wehrkraft", () => {
  it("setzt sich aus Soldaten in der Burg, Befestigungen und Siegeln zusammen", () => {
    const sim = act5Sim((s) => {
      s.warroom.soldiers = 100;
      s.siege.fortifications.palisade = 2;
      s.warroom.seals = 4;
    });
    const base = 100 * SOLDIER_DEFENSE + 2 * FORTIFICATIONS.palisade.defense;
    expect(defense(sim.view)).toBeCloseTo(base * (1 + 4 * SEAL_BONUS));
  });

  it("Befestigungen kosten Gold und erst ab der Belagerung", () => {
    const early = act5Sim((s) => {
      s.flags.act4Complete = false;
      s.resources.gold = new Decimal(1e20);
    });
    expect(early.dispatch({ type: "buildFortification", fortification: "palisade", amount: 1 }).ok).toBe(false);
    const sim = act5Sim((s) => (s.resources.gold = new Decimal(1e20)));
    expect(sim.dispatch({ type: "buildFortification", fortification: "tower", amount: 3 }).ok).toBe(true);
    expect(sim.view.siege.fortifications.tower).toBe(3);
  });

  it("Wehrkraft-Upgrades multiplizieren", () => {
    const sim = act5Sim((s) => {
      s.warroom.soldiers = 100;
      s.resources.gold = new Decimal(1e20);
    });
    const before = defense(sim.view);
    sim.dispatch({ type: "buyUpgrade", upgrade: "blessed_arrows" });
    expect(defense(sim.view) / before).toBeCloseTo(2);
  });
});

describe("Belagerung: Schlachten", () => {
  it("verlangt genug Wehrkraft für die nächste Welle", () => {
    const sim = act5Sim((s) => (s.warroom.soldiers = 1));
    expect(battleBlocker(sim.view)).toBe("weak");
    expect(sim.dispatch({ type: "battle" }).ok).toBe(false);
  });

  it("eine gewonnene Schlacht kostet Soldaten und füllt die Krypta", () => {
    const first = WAVES[0];
    if (first === undefined) throw new Error("Keine Wellen definiert");
    const soldiers = 1_000;
    const sim = act5Sim((s) => (s.warroom.soldiers = soldiers));
    expect(sim.dispatch({ type: "battle" }).ok).toBe(true);
    expect(battleBlocker(sim.view)).toBe("fighting");
    sim.tick(first.durationSeconds + 1);
    const lost = Math.floor(soldiers * first.lossRate);
    expect(sim.view.siege.wave).toBe(1);
    expect(sim.view.warroom.soldiers).toBe(soldiers - lost);
    expect(sim.view.warroom.fallen).toBe(lost);
    expect(sim.view.story.completed).toContain("a5_first_wave");
  });

  it("das Ritual bricht eine laufende Schlacht ab, behält aber abgewehrte Wellen", () => {
    const sim = act5Sim((s) => {
      s.warroom.soldiers = 1_000;
      s.siege.wave = 2;
      s.siege.fortifications.palisade = 5;
      s.runTotals.gold = new Decimal(1e17);
    });
    sim.dispatch({ type: "battle" });
    expect(sim.dispatch({ type: "ritual" }).ok).toBe(true);
    expect(sim.view.siege).toMatchObject({ wave: 2, battle: null });
    expect(sim.view.siege.fortifications.palisade).toBe(0);
  });

  it("endet nach der letzten Welle", () => {
    const sim = act5Sim((s) => (s.siege.wave = WAVES.length));
    expect(siegeActive(sim.view)).toBe(false);
    expect(battleBlocker(sim.view)).toBe("inactive");
  });
});

describe("Zwei Enden", () => {
  const afterBishop = (s: GameState): void => {
    s.siege.wave = WAVES.length;
    s.story.completed.push("a5_first_wave", "a5_brannoc", "a5_ilse", "a5_bishop", "a5_fall");
  };

  it("sind erst nach dem Bischof wählbar", () => {
    const sim = act5Sim((s) => (s.resources.faith = new Decimal(1e12)));
    expect(endingBlocker(sim.view, "light")).toBe("notYet");
  });

  it.each([
    ["light", "faith", "a5_end_light"],
    ["ash", "souls", "a5_end_ash"],
  ] as const)("Ende %s kostet %s und schließt das Spiel ab", (ending, resource, node) => {
    const sim = act5Sim((s) => {
      afterBishop(s);
      s.resources[resource] = new Decimal(ENDINGS[ending].cost);
    });
    expect(sim.dispatch({ type: "chooseEnding", ending }).ok).toBe(true);
    expect(sim.view.flags.act5Complete).toBe(true);
    expect(sim.view.story.completed).toContain(node);
    expect(sim.view.resources[resource].eq(0)).toBe(true);
    const other = ending === "light" ? "ash" : "light";
    expect(endingBlocker(sim.view, other)).toBe("chosen");
  });

  it("scheitert ohne genug Glauben oder Seelen", () => {
    const sim = act5Sim(afterBishop);
    expect(endingBlocker(sim.view, "light")).toBe("cost");
    expect(endingBlocker(sim.view, "ash")).toBe("cost");
  });
});

describe("Speichern mit Akt-V-Daten", () => {
  it("überlebt einen Roundtrip mit laufender Schlacht", () => {
    const sim = act5Sim((s) => {
      s.warroom.soldiers = 5_000;
      s.siege.wave = 3;
      s.siege.fortifications.tower = 4;
    });
    expect(sim.dispatch({ type: "battle" }).ok).toBe(true);
    sim.tick(5);
    const restored = importSave(exportSave(sim.view), 0);
    expect(toPlain(restored)).toEqual(toPlain(sim.view));
    expect(restored.siege.battle).not.toBeNull();
  });
});
