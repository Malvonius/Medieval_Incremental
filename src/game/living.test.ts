import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { EVENT_ROLL_SECONDS } from "../content/depth";
import { LOYALTY_FAVOR, LOYALTY_START, MERCHANT_FIRST_SECONDS, PLAN_NEIGHBOUR_BONUS, QUESTS, RAVEN_GIFT_SECONDS, SEASON_SECONDS } from "../content/living";
import { exportSave, importSave } from "./persistence";
import { planFactor, seasonOf } from "./living";
import { resourceFactors } from "./rates";
import { Simulation } from "./simulation";
import { type GameState, createInitialState } from "./state";

const sim = (mutate?: (s: GameState) => void): Simulation => {
  const state = createInitialState(0);
  state.tiles.keep = true;
  mutate?.(state);
  return new Simulation(state);
};

describe("Jahreszeiten", () => {
  it("wechseln alle 15 Minuten und wirken auf die Produktion", () => {
    expect(seasonOf(0)).toBe("spring");
    expect(seasonOf(SEASON_SECONDS * 3 + 1)).toBe("winter");
    expect(seasonOf(SEASON_SECONDS * 4)).toBe("spring");
    const winter = sim((st) => (st.stats.playSeconds = SEASON_SECONDS * 3));
    expect(resourceFactors(winter.view, "gold").find((f) => f.label === "Jahreszeit")?.value.toNumber()).toBeCloseTo(0.8);
    expect(resourceFactors(winter.view, "faith").find((f) => f.label === "Jahreszeit")?.value.toNumber()).toBeCloseTo(1.3);
  });

  it("ein Wechsel aktualisiert die zwischengespeicherten Raten", () => {
    const s = sim((st) => {
      st.buildings.serf = 10;
      st.stats.playSeconds = SEASON_SECONDS * 3 - 0.05;
    });
    const autumn = s.rates.gold;
    s.tick(0.1);
    expect(s.rates.gold.lt(autumn)).toBe(true);
  });
});

describe("Der Rabe", () => {
  it("bringt nach zehn Minuten ein Geschenk, das man abholt", () => {
    const s = sim((st) => (st.buildings.serf = 10));
    expect(s.dispatch({ type: "pokeRaven" }).ok).toBe(true);
    expect(s.view.raven.gift).toBe(false);
    s.tick(RAVEN_GIFT_SECONDS);
    expect(s.view.raven.gift).toBe(true);
    const before = s.view.resources.gold;
    s.dispatch({ type: "pokeRaven" });
    expect(s.view.resources.gold.gt(before)).toBe(true);
    expect(s.view.raven.gift).toBe(false);
    expect(s.view.raven.pokes).toBe(2);
  });
});

describe("Der Händler", () => {
  it("kommt, bietet an, lässt mit sich feilschen und verkauft", () => {
    const s = sim((st) => {
      st.tiles.forge = true;
      st.buildings.serf = 50;
      st.resources.gold = new Decimal(1e9);
    });
    s.tick(MERCHANT_FIRST_SECONDS + 1);
    expect(s.view.merchant.present).toBe(true);
    expect(s.view.merchant.offers.length).toBeGreaterThan(0);
    const price = s.view.merchant.offers[0]?.price ?? new Decimal(0);
    expect(s.dispatch({ type: "haggle", index: 0 }).ok).toBe(true);
    const mood = s.view.merchant.offers[0]?.mood;
    expect(["deal", "firm", "offended"]).toContain(mood);
    if (mood === "deal") expect(s.view.merchant.offers[0]?.price.lt(price)).toBe(true);
    expect(s.dispatch({ type: "haggle", index: 0 }).ok).toBe(false);
    if (mood !== "offended") {
      expect(s.dispatch({ type: "buyOffer", index: 0 }).ok).toBe(true);
      expect(s.view.merchant.offers[0]?.mood).toBe("sold");
    }
  });
});

describe("Folgeereignisse", () => {
  it("wer bei der Pest nur betet, bekommt später die Seuchenwelle", () => {
    const s = sim((st) => {
      st.events.pending = "plague";
      st.events.timer = 1e9;
    });
    s.dispatch({ type: "resolveEvent", choice: 1 });
    expect(s.view.events.followUps).toHaveLength(1);
    s.tick(901);
    expect(s.view.events.pending).toBe("plague_wave");
  });

  it("Folgeereignisse kommen nie zufällig", () => {
    const s = sim((st) => {
      st.rng = 7;
      st.buildings.serf = 30;
    });
    for (let i = 0; i < 200; i += 1) {
      s.tick(EVENT_ROLL_SECONDS);
      expect(["plague_wave", "preacher", "raid_return"]).not.toContain(s.view.events.pending);
      if (s.view.events.pending) s.dispatch({ type: "resolveEvent", choice: 0 });
    }
  });
});

describe("Burgplan", () => {
  it("passende Nachbarn geben Boni; Viertel lassen sich verschieben", () => {
    const s = sim((st) => {
      st.buildings.serf = 5;
      st.buildings.mill = 1;
      st.buildings.market = 1;
    });
    expect(s.dispatch({ type: "placeDistrict", index: 0, building: "serf" }).ok).toBe(true);
    expect(s.dispatch({ type: "placeDistrict", index: 1, building: "mill" }).ok).toBe(true);
    expect(planFactor(s.view, "serf")).toBeCloseTo(1 + PLAN_NEIGHBOUR_BONUS);
    expect(planFactor(s.view, "mill")).toBeCloseTo(1 + PLAN_NEIGHBOUR_BONUS);
    s.dispatch({ type: "placeDistrict", index: 7, building: "serf" });
    expect(s.view.plan[0]).toBeNull();
    expect(planFactor(s.view, "serf")).toBe(1);
    expect(s.dispatch({ type: "placeDistrict", index: 2, building: "bank" }).ok).toBe(false);
  });
});

describe("Gefolge: Treue und Aufträge", () => {
  it("Bevorzugen verärgert den Rivalen, bis er geht", () => {
    const s = sim((st) => {
      st.tiles.hall = true;
      st.resources.gold = new Decimal(1e12);
    });
    const left: string[] = [];
    s.events.on("departed", (id) => left.push(id));
    s.dispatch({ type: "hire", retainer: "gunther" });
    s.dispatch({ type: "hire", retainer: "wendel" });
    expect(s.view.retinue.wendel?.loyalty).toBe(LOYALTY_START);
    const steps = Math.ceil(LOYALTY_START / LOYALTY_FAVOR);
    for (let i = 0; i < steps; i += 1) s.dispatch({ type: "levelRetainer", retainer: "gunther" });
    expect(s.view.retinue.wendel).toBeNull();
    expect(left).toEqual(["wendel"]);
  });

  it("ein Auftrag kostet, läuft ab und belohnt mit Stufe, Treue und Geschichte", () => {
    const s = sim((st) => {
      st.tiles.hall = true;
      st.resources.gold = new Decimal(1e6);
    });
    const stories: string[] = [];
    s.events.on("quest", (q) => stories.push(`${q.retainer}:${q.step}`));
    s.dispatch({ type: "hire", retainer: "gunther" });
    expect(s.dispatch({ type: "startQuest", retainer: "gunther" }).ok).toBe(true);
    expect(s.dispatch({ type: "startQuest", retainer: "gunther" }).ok).toBe(false);
    s.tick((QUESTS.gunther[0]?.seconds ?? 0) + 1);
    expect(stories).toEqual(["gunther:0"]);
    expect(s.view.retinue.gunther?.level).toBe(2);
    expect(s.view.retinue.gunther?.quest).toBe(1);
  });
});

describe("Speichern", () => {
  it("bewahrt Rabe, Händler, Burgplan und Folgeereignisse", () => {
    const s = sim((st) => {
      st.buildings.serf = 1;
      st.plan[3] = "serf";
      st.raven = { timer: 12, gift: true, pokes: 4 };
      st.events.followUps.push({ id: "preacher", at: 99 });
      st.merchant = { timer: 30, present: true, offers: [{ kind: "fortune", price: new Decimal(500), amount: new Decimal(0), mood: "firm" }] };
    });
    const back = importSave(exportSave(s.view), 0);
    expect(back.plan[3]).toBe("serf");
    expect(back.raven).toEqual({ timer: 12, gift: true, pokes: 4 });
    expect(back.events.followUps).toEqual([{ id: "preacher", at: 99 }]);
    expect(back.merchant.offers[0]?.price.toNumber()).toBe(500);
    expect(back.merchant.offers[0]?.mood).toBe("firm");
  });
});
