import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { encodeSave } from "../core/save";
import { FORGE_QUEUE_CAPACITY, OFFLINE_CAP_SECONDS, OFFLINE_EFFICIENCY, RECIPES } from "../content/balance";
import { applyOfflineProgress } from "./offline";
import { exportSave, importSave, readSave, writeSave, SAVE_KEY, CORRUPT_BACKUP_KEY } from "./persistence";
import { toPlain } from "./serialize";
import { Simulation } from "./simulation";
import { type GameState, SAVE_VERSION, createInitialState } from "./state";

const exportSaveOf = (partial: object): string => encodeSave(partial, SAVE_VERSION);

function freshSim(mutate?: (s: GameState) => void): Simulation {
  const state = createInitialState(0);
  mutate?.(state);
  const sim = new Simulation(state);
  sim.tick(1e-3); // Startknoten auslösen
  return sim;
}

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

describe("Aktionen", () => {
  it("schaltet zum Start Burgfried und Chronik frei", () => {
    const sim = freshSim();
    expect(sim.view.tiles.keep).toBe(true);
    expect(sim.view.tiles.chronicle).toBe(true);
    expect(sim.view.tiles.forge).toBe(false);
  });

  it("Steuern eintreiben bringt Gold", () => {
    const sim = freshSim();
    expect(sim.dispatch({ type: "collect" }).ok).toBe(true);
    expect(sim.view.resources.gold.gt(0)).toBe(true);
  });

  it("verweigert Käufe ohne Gold, ohne Zustand zu verändern", () => {
    const sim = freshSim();
    const result = sim.dispatch({ type: "buyBuilding", building: "serf", amount: 1 });
    expect(result).toEqual({ ok: false, reason: "Nicht genug Gold." });
    expect(sim.view.buildings.serf).toBe(0);
  });

  it("kauft, zieht die Kosten ab und erhöht die Produktion", () => {
    const sim = freshSim((s) => (s.resources.gold = new Decimal(1_000)));
    expect(sim.dispatch({ type: "buyBuilding", building: "serf", amount: "max" }).ok).toBe(true);
    expect(sim.view.buildings.serf).toBeGreaterThan(10);
    expect(sim.view.resources.gold.lt(1_000)).toBe(true);
    expect(sim.rates.gold.gt(0)).toBe(true);
  });

  it("verweigert Gebäude in gesperrten Kacheln", () => {
    const sim = freshSim((s) => (s.resources.gold = new Decimal(1e9)));
    expect(sim.dispatch({ type: "buyBuilding", building: "mine", amount: 1 }).ok).toBe(false);
  });

  it("verweigert ungültige Mengen", () => {
    const sim = freshSim((s) => (s.resources.gold = new Decimal(1e9)));
    expect(sim.dispatch({ type: "buyBuilding", building: "serf", amount: 0 }).ok).toBe(false);
    expect(sim.dispatch({ type: "buyBuilding", building: "serf", amount: 2.5 }).ok).toBe(false);
  });
});

describe("Schmiede", () => {
  const richForge = (s: GameState): void => {
    s.tiles.forge = true;
    s.resources.gold = new Decimal(1e9);
    s.resources.iron = new Decimal(1e9);
  };

  it("begrenzt die Warteschlange", () => {
    const sim = freshSim(richForge);
    expect(sim.dispatch({ type: "craft", recipe: "sword", amount: FORGE_QUEUE_CAPACITY }).ok).toBe(true);
    expect(sim.dispatch({ type: "craft", recipe: "sword", amount: 1 }).ok).toBe(false);
  });

  it("stellt über große Zeitschritte mehrere Klingen fertig und erhöht das Gold-Einkommen", () => {
    const sim = freshSim((s) => {
      richForge(s);
      s.buildings.serf = 10;
    });
    const before = sim.rates.gold;
    sim.dispatch({ type: "craft", recipe: "sword", amount: 3 });
    sim.tick(RECIPES.sword.durationSeconds * 3 + 0.5);
    expect(sim.view.resources.swords.eq(3)).toBe(true);
    expect(sim.view.forge.queue).toHaveLength(0);
    expect(sim.rates.gold.gt(before)).toBe(true);
  });
});

describe("Speichern & Laden", () => {
  it("überlebt einen Roundtrip", () => {
    const sim = freshSim((s) => {
      s.resources.gold = new Decimal("1.2345e42");
      s.buildings.mill = 17;
      s.upgrades.heavy_axes = true;
      s.forge.queue.push("sword");
    });
    const restored = importSave(exportSave(sim.view), 0);
    expect(toPlain(restored)).toEqual(toPlain(sim.view));
  });

  it("ergänzt fehlende Felder mit Standardwerten", () => {
    const restored = importSave(exportSaveOf({ buildings: { serf: 3 } }), 0);
    expect(restored.buildings.serf).toBe(3);
    expect(restored.buildings.mill).toBe(0);
    expect(restored.resources.gold.eq(0)).toBe(true);
  });

  it("lehnt falsche Typen ab", () => {
    expect(() => importSave(exportSaveOf({ buildings: { serf: -1 } }), 0)).toThrow(/serf/);
    expect(() => importSave(exportSaveOf({ resources: { gold: 5 } }), 0)).toThrow(/gold/);
    expect(() => importSave(exportSaveOf({ forge: { queue: ["axt"] } }), 0)).toThrow(/Rezepte/);
  });

  it("sichert einen beschädigten Spielstand, statt ihn zu überschreiben", () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, "kaputt");
    const result = readSave(storage, 0);
    expect(result.kind).toBe("corrupt");
    expect(storage.map.get(CORRUPT_BACKUP_KEY)).toBe("kaputt");
  });

  it("schreibt und liest über den Storage", () => {
    const storage = memoryStorage();
    const sim = freshSim();
    writeSave(storage, sim.view);
    expect(readSave(storage, 0).kind).toBe("loaded");
  });
});

describe("Offline-Fortschritt", () => {
  it("ist gedeckelt und hat reduzierte Effizienz", () => {
    const sim = freshSim((s) => (s.buildings.serf = 10));
    const report = applyOfflineProgress(sim, 24 * 3600 * 1000);
    expect(report?.simulatedSeconds).toBe(OFFLINE_CAP_SECONDS * OFFLINE_EFFICIENCY);
    expect(report?.gains.gold.gt(0)).toBe(true);
  });

  it("meldet kurze Abwesenheiten nicht", () => {
    expect(applyOfflineProgress(freshSim(), 5_000)).toBeNull();
  });
});
