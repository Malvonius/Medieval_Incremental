import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { EXPEDITIONS, RESEARCH, WAVES } from "../content/balance";
import { RESOURCE_IDS } from "../content/ids";
import { readSave, slotKey, summarizeSlot, writeSave } from "./persistence";
import { baseSources, computeRates, resourceFactors } from "./rates";
import { Simulation } from "./simulation";
import { type GameState, createInitialState } from "./state";

const rich = (): GameState => {
  const s = createInitialState(0);
  Object.assign(s.buildings, { serf: 12, mill: 3, mine: 4, candle: 5, offering_box: 2 });
  s.resources.swords = new Decimal(30);
  s.warroom.seals = 4;
  s.warroom.fallen = 50;
  s.tiles.crypt = true;
  s.dungeon.laborers = 7;
  s.ritual.ash = 9;
  s.meta.memories = 1;
  s.achievements.first_coin = true;
  s.upgrades.pact_hunger = true;
  s.events.buff = { resource: "gold", factor: 2, remaining: 60 };
  return s;
};

describe("Raten-Aufschlüsselung", () => {
  it("Grundproduktion × Faktoren ergibt exakt die berechnete Rate", () => {
    const state = rich();
    const rates = computeRates(state);
    for (const resource of RESOURCE_IDS) {
      const base = baseSources(state, resource).reduce((sum, s) => sum.add(s.value), new Decimal(0));
      const total = resourceFactors(state, resource).reduce((p, f) => p.mul(f.value), base);
      expect(total.toNumber()).toBeCloseTo(rates[resource].toNumber(), 6);
    }
  });

  it("nennt alle wirksamen Faktoren und lässt neutrale weg", () => {
    const labels = resourceFactors(rich(), "gold").map((f) => f.label);
    expect(labels).toEqual(["Bewaffnung", "Ordenssiegel", "Fronarbeit", "Pakte, Forschung & Gelübde", "Ereignis", "Asche", "Erfolge", "Erinnerungen"]);
    expect(resourceFactors(createInitialState(0), "gold")).toEqual([]);
  });
});

describe("Fertig-Meldungen", () => {
  it("meldet Expedition, Forschung und Schlacht genau einmal", () => {
    const s = createInitialState(0);
    for (const t of ["warroom", "alchemy"] as const) s.tiles[t] = true;
    s.flags.act4Complete = true;
    s.warroom.active.push({ id: "bandits", remaining: 1, soldiers: 8 });
    s.alchemy.active = { id: "mercury", remaining: 1 };
    s.siege.battle = { remaining: 1 };
    const sim = new Simulation(s);
    const seen: string[] = [];
    sim.events.on("completed", (c) => seen.push(c.kind));
    sim.tick(2);
    sim.tick(2);
    expect(seen.sort()).toEqual(["battle", "expedition", "research"]);
    expect(EXPEDITIONS.bandits && RESEARCH.mercury && WAVES[0]).toBeTruthy();
  });
});

describe("Speicherplätze", () => {
  const memory = () => {
    const map = new Map<string, string>();
    return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) };
  };

  it("Platz 1 nutzt den bisherigen Schlüssel, die Plätze sind getrennt", () => {
    const storage = memory();
    const a = createInitialState(0);
    a.buildings.serf = 3;
    writeSave(storage, a, 1);
    writeSave(storage, createInitialState(0), 2);
    expect(slotKey(1)).toBe("vhal.save");
    expect(storage.map.has("vhal.save.2")).toBe(true);
    const loaded = readSave(storage, 0, 1);
    expect(loaded.kind === "loaded" && loaded.state.buildings.serf).toBe(3);
    expect(readSave(storage, 0, 3).kind).toBe("empty");
    expect(summarizeSlot(storage, 1, 0)).toMatchObject({ kind: "loaded", act: 1 });
  });
});
