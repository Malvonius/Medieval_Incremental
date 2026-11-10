import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { CHALLENGES, EVENT_ROLL_SECONDS, MEMORY_BONUS } from "../content/depth";
import { decisionOpen } from "./depth";
import { defense } from "./rates";
import { exportSave, importSave } from "./persistence";
import { Simulation } from "./simulation";
import { type GameState, createInitialState } from "./state";

const sim = (mutate?: (s: GameState) => void): Simulation => {
  const state = createInitialState(0);
  state.tiles.keep = true;
  mutate?.(state);
  return new Simulation(state);
};

describe("Zufallsereignisse", () => {
  it("sind mit gleichem Startwert reproduzierbar", () => {
    const run = (): string | null => {
      const s = sim((st) => {
        st.rng = 12345;
        st.buildings.serf = 30;
      });
      for (let i = 0; i < 20 && s.view.events.pending === null; i += 1) s.tick(EVENT_ROLL_SECONDS);
      return s.view.events.pending;
    };
    expect(run()).not.toBeNull();
    expect(run()).toBe(run());
  });

  it("eine Wahl wendet Effekte an und schließt das Ereignis", () => {
    const s = sim((st) => {
      st.events.pending = "harvest";
      st.buildings.serf = 10;
    });
    const before = s.rates.gold;
    expect(s.dispatch({ type: "resolveEvent", choice: 0 }).ok).toBe(true);
    expect(s.view.events.pending).toBeNull();
    expect(s.rates.gold.div(before).toNumber()).toBeCloseTo(2);
    s.tick(301);
    expect(s.view.events.buff).toBeNull();
    expect(s.rates.gold.eq(before)).toBe(true);
  });

  it("lehnt Wahl ohne Ereignis oder mit falschem Index ab", () => {
    expect(sim().dispatch({ type: "resolveEvent", choice: 0 }).ok).toBe(false);
    expect(sim((st) => (st.events.pending = "plague")).dispatch({ type: "resolveEvent", choice: 5 }).ok).toBe(false);
  });
});

describe("Verwalter", () => {
  it("kauft selbstständig und lässt sich abschalten", () => {
    const s = sim((st) => {
      st.upgrades.steward = true;
      st.resources.gold = new Decimal(1_000);
    });
    s.tick(1);
    expect(s.view.buildings.serf).toBeGreaterThan(0);
    expect(s.dispatch({ type: "setAutomation", enabled: false }).ok).toBe(true);
    const serfs = s.view.buildings.serf;
    (s.view as GameState).resources.gold = new Decimal(1e6);
    s.tick(2);
    expect(s.view.buildings.serf).toBe(serfs);
  });
});

describe("Entscheidung Sera/Ilse", () => {
  it("steht nach „Die Rückkehr der Schülerin“ an und wirkt einmalig", () => {
    const s = sim((st) => {
      st.story.completed.push("a5_ilse");
      st.warroom.soldiers = 100;
    });
    expect(decisionOpen(s.view, "trust")).toBe(true);
    const before = defense(s.view);
    expect(s.dispatch({ type: "decide", decision: "trust", option: 0 }).ok).toBe(true);
    expect(defense(s.view) / before).toBeCloseTo(1.5);
    expect(s.dispatch({ type: "decide", decision: "trust", option: 1 }).ok).toBe(false);
  });
});

describe("Gelübde-Verbindungen", () => {
  it("wirken nur, wenn beide Gelübde abgelegt sind", () => {
    const make = (both: boolean): Simulation =>
      sim((st) => {
        st.buildings.offering_box = 10;
        st.chapel.vows.penance = true;
        st.chapel.vows.silence = both;
      });
    expect(make(true).rates.faith.div(make(false).rates.faith).toNumber()).toBeCloseTo(2);
  });
});

describe("Neues Spiel+ und Herausforderungen", () => {
  const finished = (st: GameState): void => {
    st.flags.act5Complete = true;
    st.achievements.first_coin = true;
    st.buildings.mill = 50;
    st.story.completed.push("a1_inheritance");
  };

  it("setzt zurück, behält Erinnerungen und Erfolge und startet die Story neu", () => {
    const s = sim(finished);
    expect(s.dispatch({ type: "newGamePlus", challenge: "poverty" }).ok).toBe(true);
    expect(s.view.buildings.mill).toBe(0);
    expect(s.view.flags.act5Complete).toBe(false);
    expect(s.view.meta).toMatchObject({ ngPlus: 1, memories: 1, challenge: "poverty" });
    expect(s.view.achievements.first_coin).toBe(true);
    s.tick(0.1);
    expect(s.view.story.completed).toEqual(["a1_inheritance", "a1_memory"]);
  });

  it("Erinnerungen und Herausforderungs-Einschränkung wirken auf die Produktion", () => {
    const base = sim((st) => (st.buildings.serf = 10)).rates.gold;
    const ng = sim((st) => {
      st.buildings.serf = 10;
      st.meta.memories = 1;
      st.meta.challenge = "poverty";
    }).rates.gold;
    expect(ng.div(base).toNumber()).toBeCloseTo((1 + MEMORY_BONUS) * 0.5);
  });

  it("eine abgeschlossene Herausforderung gibt ihre Belohnung dauerhaft", () => {
    const s = sim((st) => {
      finished(st);
      st.meta.challenge = "poverty";
    });
    s.dispatch({ type: "newGamePlus", challenge: null });
    expect(s.view.meta.challengesDone.poverty).toBe(true);
    const reward = CHALLENGES.poverty.reward;
    expect(reward.kind === "resourceMult" && reward.factor).toBe(1.5);
  });

  it("ist erst nach einem Ende möglich und übersteht Speichern", () => {
    expect(sim().dispatch({ type: "newGamePlus", challenge: null }).ok).toBe(false);
    const s = sim(finished);
    s.dispatch({ type: "newGamePlus", challenge: "silence" });
    expect(importSave(exportSave(s.view), 0).meta).toEqual(s.view.meta);
  });
});
