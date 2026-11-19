import { describe, expect, it } from "vitest";
import { Decimal } from "../core/decimal";
import { FACTIONS, MAP_CENTER, MAP_SIZE, MAP_TILE_BONUS, RETAINER_LEVEL_BONUS, SWORDS_PER_BLADE, TALENTS } from "../content/extensions";
import { WAVES } from "../content/balance";
import { chainFlow, conquestStrength, emberGain, endingUnlocked, isBorder } from "./extensions";
import { landFactor, retinueFactor } from "./bonuses";
import { endingBlocker } from "./siege";
import { exportSave, importSave } from "./persistence";
import { catchUp } from "./offline";
import { resourceFactors } from "./rates";
import { Simulation } from "./simulation";
import { type GameState, createInitialState } from "./state";

const sim = (mutate?: (s: GameState) => void): Simulation => {
  const state = createInitialState(0);
  state.tiles.keep = true;
  mutate?.(state);
  return new Simulation(state);
};

describe("Aschen-Automaten", () => {
  it("sind ohne Ritual gesperrt und ab dem ersten Ritual schaltbar", () => {
    const s = sim();
    expect(s.dispatch({ type: "setAutomator", automator: "buildings", enabled: true }).ok).toBe(false);
    const t = sim((st) => (st.ritual.performed = 1));
    expect(t.dispatch({ type: "setAutomator", automator: "buildings", enabled: true }).ok).toBe(true);
    expect(t.dispatch({ type: "setAutomator", automator: "recruit", enabled: true }).ok).toBe(false);
  });

  it("kaufen nur unterhalb der Schwelle", () => {
    const s = sim((st) => {
      st.ritual.performed = 1;
      st.autobuy.enabled.buildings = true;
      st.autobuy.threshold = 0.5;
      st.resources.gold = new Decimal(15);
    });
    s.tick(1);
    // Ein Leibeigener kostet 10 Gold: 10 > 0,5 × 15, also kein Kauf.
    expect(s.view.buildings.serf).toBe(0);
    expect(s.dispatch({ type: "setAutoThreshold", threshold: 1 }).ok).toBe(true);
    s.tick(1);
    expect(s.view.buildings.serf).toBeGreaterThan(0);
  });

  it("kaufen ausgewählte Gebäude, sobald das Geld reicht – unabhängig von der Schwelle", () => {
    const s = sim((st) => {
      st.autobuy.threshold = 0.01;
      st.autobuy.picks.serf = true;
      // 11 Gold: der erste Leibeigene kostet 10, der zweite 11,5 – genau einer ist bezahlbar.
      st.resources.gold = new Decimal(11);
    });
    s.tick(1);
    expect(s.view.buildings.serf).toBe(1);
    expect(s.view.resources.gold.toNumber()).toBeCloseTo(1);
  });

  it("kaufen einzeln ausgewählte Gebäude auch ohne Ritual – und nur diese", () => {
    const s = sim((st) => {
      st.tiles.forge = true;
      st.autobuy.threshold = 1;
      st.resources.gold = new Decimal(1e6);
      st.resources.iron = new Decimal(1e6);
    });
    expect(s.dispatch({ type: "setBuildingAuto", building: "serf", enabled: true }).ok).toBe(true);
    s.tick(1);
    expect(s.view.buildings.serf).toBeGreaterThan(0);
    const others = Object.entries(s.view.buildings).filter(([id, n]) => id !== "serf" && n > 0);
    expect(others).toEqual([]);
    s.dispatch({ type: "setBuildingAuto", building: "serf", enabled: false });
    const count = s.view.buildings.serf;
    s.tick(2);
    expect(s.view.buildings.serf).toBe(count);
  });

  it("schmieden ausgewählte Rezepte automatisch, sobald die Rohstoffe reichen", () => {
    const s = sim((st) => {
      st.tiles.forge = true;
      st.resources.gold = new Decimal(400 * 3);
      st.resources.iron = new Decimal(30 * 3);
    });
    s.tick(1);
    expect(s.view.forge.queue.length).toBe(0);
    expect(s.dispatch({ type: "setRecipeAuto", recipe: "sword", enabled: true }).ok).toBe(true);
    s.tick(1);
    expect(s.view.forge.queue.length).toBe(3);
    expect(s.view.resources.iron.toNumber()).toBe(0);
  });

  it("verweigern noch unsichtbare Gebäude", () => {
    const s = sim();
    expect(s.dispatch({ type: "setBuildingAuto", building: "bell_tower", enabled: true }).ok).toBe(false);
  });

  it("lehnen ungültige Schwellen ab", () => {
    const s = sim();
    expect(s.dispatch({ type: "setAutoThreshold", threshold: 0 }).ok).toBe(false);
    expect(s.dispatch({ type: "setAutoThreshold", threshold: 1.5 }).ok).toBe(false);
  });
});

describe("Aufstieg und Talentbaum", () => {
  it("verlangt ein Ende und wandelt Erinnerungen und Asche in Glut", () => {
    const s = sim((st) => {
      st.meta.memories = 2;
      st.ritual.ash = 99;
    });
    expect(s.dispatch({ type: "ascend" }).ok).toBe(false);
    const t = sim((st) => {
      st.flags.act5Complete = true;
      st.meta.memories = 2;
      st.ritual.ash = 99;
      st.meta.codex.vhal = true;
      st.achievements.first_coin = true;
    });
    const gain = emberGain(t.view);
    expect(gain).toBe(1 + 2 + 4);
    expect(t.dispatch({ type: "ascend" }).ok).toBe(true);
    expect(t.view.meta.embers).toBe(gain);
    expect(t.view.meta.memories).toBe(0);
    expect(t.view.ritual.ash).toBe(0);
    expect(t.view.meta.ascensions).toBe(1);
    expect(t.view.meta.codex.vhal).toBe(true);
    expect(t.view.achievements.first_coin).toBe(true);
    expect(t.view.meta.runLog.at(-1)?.kind).toBe("ascend");
  });

  it("Talente brauchen Vorgänger und Glut und wirken dauerhaft", () => {
    const s = sim((st) => (st.meta.embers = 3));
    expect(s.dispatch({ type: "buyTalent", talent: "goldGlow" }).ok).toBe(false);
    expect(s.dispatch({ type: "buyTalent", talent: "spark" }).ok).toBe(true);
    expect(s.dispatch({ type: "buyTalent", talent: "goldGlow" }).ok).toBe(true);
    expect(s.view.meta.embers).toBe(3 - TALENTS.spark.cost - TALENTS.goldGlow.cost);
    expect(resourceFactors(s.view, "gold").find((f) => f.label === "Glut-Talente")?.value.toNumber()).toBe(2);
    expect(s.dispatch({ type: "buyTalent", talent: "spark" }).ok).toBe(false);
  });

  it("„Ewige Hände“ schaltet alle Automaten frei", () => {
    const s = sim((st) => (st.meta.talents.hands = true));
    expect(s.dispatch({ type: "setAutomator", automator: "recruit", enabled: true }).ok).toBe(true);
  });
});

describe("Fraktionen", () => {
  it("Umwerben hebt den Ruf und verärgert den Rivalen; Kosten steigen", () => {
    const s = sim((st) => {
      st.tiles.hall = true;
      st.resources.gold = new Decimal(1e6);
    });
    const before = s.view.resources.gold;
    expect(s.dispatch({ type: "court", faction: "church" }).ok).toBe(true);
    expect(s.view.factions.rep.church).toBe(10);
    expect(s.view.factions.rep[FACTIONS.church.rival]).toBe(-5);
    const firstCost = before.sub(s.view.resources.gold);
    const mid = s.view.resources.gold;
    s.dispatch({ type: "court", faction: "church" });
    expect(mid.sub(s.view.resources.gold).gt(firstCost)).toBe(true);
  });

  it("ab +50 segnet, ab −50 verflucht eine Fraktion", () => {
    const blessed = sim((st) => (st.factions.rep.nobility = 50));
    expect(resourceFactors(blessed.view, "gold").find((f) => f.label === "Ruf")?.value.toNumber()).toBe(1.25);
    const cursed = sim((st) => (st.factions.rep.nobility = -50));
    expect(resourceFactors(cursed.view, "gold").find((f) => f.label === "Ruf")?.value.toNumber()).toBeCloseTo(0.85);
  });

  it("Entscheidungen verschieben den Ruf", () => {
    const s = sim((st) => st.story.completed.push("a5_ilse"));
    expect(s.dispatch({ type: "decide", decision: "trust", option: 1 }).ok).toBe(true);
    expect(s.view.factions.rep.church).toBe(-20);
  });
});

describe("Gefolge", () => {
  it("Amt und Wunschamt bestimmen den Bonus; ein Amt hat nur einen Inhaber", () => {
    const s = sim((st) => {
      st.tiles.hall = true;
      st.resources.gold = new Decimal(1e9);
      st.resources.swords = new Decimal(100);
    });
    expect(s.dispatch({ type: "hire", retainer: "gunther" }).ok).toBe(true);
    expect(s.dispatch({ type: "hire", retainer: "gunther" }).ok).toBe(false);
    s.dispatch({ type: "assignRetainer", retainer: "gunther", office: "bailiff" });
    expect(retinueFactor(s.view, "gold")).toBeCloseTo(1 + RETAINER_LEVEL_BONUS * 2);
    s.dispatch({ type: "equipRetainer", retainer: "gunther" });
    expect(retinueFactor(s.view, "gold")).toBeCloseTo(1 + RETAINER_LEVEL_BONUS * 2 * 1.5);
    s.dispatch({ type: "hire", retainer: "hedda" });
    s.dispatch({ type: "assignRetainer", retainer: "hedda", office: "bailiff" });
    expect(s.view.retinue.gunther?.office).toBeNull();
    expect(s.dispatch({ type: "levelRetainer", retainer: "hedda" }).ok).toBe(true);
    expect(s.view.retinue.hedda?.level).toBe(2);
  });
});

describe("Ländereien", () => {
  it("nur Nachbarfelder sind erreichbar; Eroberung kostet Männer und bringt Ertrag", () => {
    const s = sim((st) => {
      st.tiles.warroom = true;
      st.warroom.soldiers = 1000;
    });
    const right = MAP_CENTER + 1;
    expect(isBorder(s.view, right)).toBe(true);
    expect(isBorder(s.view, 0)).toBe(false);
    expect(s.dispatch({ type: "conquer", index: 0 }).ok).toBe(false);
    const need = conquestStrength(s.view, right);
    expect(s.dispatch({ type: "conquer", index: right }).ok).toBe(true);
    expect(s.view.warroom.soldiers).toBe(1000 - Math.floor(need * 0.25));
    expect(s.view.map.owned).toContain(right);
    // Das Feld rechts der Burg ist Acker (Gold).
    expect(landFactor(s.view, "gold")).toBeCloseTo(1 + MAP_TILE_BONUS);
    expect(conquestStrength(s.view, MAP_CENTER - MAP_SIZE)).toBeGreaterThan(need);
  });
});

describe("Werkstatt-Kette", () => {
  it("die langsamste Station ist der Engpass", () => {
    const s = sim((st) => {
      st.workshop.levels = { mine: 10, smelter: 1, smithy: 5 };
    });
    expect(chainFlow(s.view).bottleneck).toBe("smelter");
  });

  it("macht aus Erz Schwerter", () => {
    const s = sim((st) => {
      st.workshop.levels = { mine: 6, smelter: 5, smithy: 1 };
    });
    s.tick(100);
    // Schmiede: 0,1 Klingen/s → nach 100 s rund 10 Klingen (abzüglich Anlaufzeit).
    const swords = s.view.resources.swords.toNumber();
    expect(swords % SWORDS_PER_BLADE).toBe(0);
    expect(swords).toBeGreaterThanOrEqual(8 * SWORDS_PER_BLADE);
  });

  it("Ausbau kostet Eisen", () => {
    const s = sim((st) => (st.tiles.forge = true));
    expect(s.dispatch({ type: "upgradeStation", station: "mine" }).ok).toBe(false);
  });
});

describe("Weitere Enden", () => {
  const atEnd = (mutate?: (st: GameState) => void): Simulation =>
    sim((st) => {
      st.siege.wave = WAVES.length;
      st.resources.faith = new Decimal(1e7);
      st.resources.gold = new Decimal(1e19);
      mutate?.(st);
    });

  it("die Eintracht verlangt hohen Ruf bei allen Fraktionen", () => {
    expect(endingBlocker(atEnd().view, "concord")).toBe("locked");
    const s = atEnd((st) => (st.factions.rep = { church: 60, nobility: 60, people: 60 }));
    expect(endingBlocker(s.view, "concord")).toBeNull();
    expect(s.dispatch({ type: "chooseEnding", ending: "concord" }).ok).toBe(true);
    expect(s.view.meta.endingsSeen.concord).toBe(true);
  });

  it("das wahre Erwachen verlangt alle anderen Enden", () => {
    const s = atEnd((st) => (st.meta.endingsSeen = { light: true, ash: true, concord: false, awakening: false }));
    expect(endingUnlocked(s.view, "awakening")).toBe(false);
    const t = atEnd((st) => (st.meta.endingsSeen = { light: true, ash: true, concord: true, awakening: false }));
    expect(endingUnlocked(t.view, "awakening")).toBe(true);
  });
});

describe("Kodex", () => {
  it("schaltet Einträge frei, meldet sie und behält sie über Neues Spiel+", () => {
    const s = sim((st) => (st.flags.act5Complete = true));
    const seen: string[] = [];
    s.events.on("codex", (id) => seen.push(id));
    s.tick(0.1);
    expect(s.view.meta.codex.vhal).toBe(true);
    expect(seen).toContain("vhal");
    expect(s.dispatch({ type: "newGamePlus", challenge: null }).ok).toBe(true);
    expect(s.view.meta.codex.vhal).toBe(true);
    expect(s.view.meta.runLog.at(-1)?.kind).toBe("ngplus");
  });

  it("der Rittersaal öffnet nach Akt I", () => {
    const s = sim((st) => (st.flags.act1Complete = true));
    s.tick(0.1);
    expect(s.view.tiles.hall).toBe(true);
  });
});

describe("Offline-Bericht", () => {
  it("zählt Gebäude der Automaten und abgeschlossene Arbeiten", () => {
    const s = sim((st) => {
      st.ritual.performed = 1;
      st.autobuy.enabled.buildings = true;
      st.autobuy.threshold = 1;
      st.buildings.serf = 5;
    });
    const report = catchUp(s, 600, 1);
    expect(report.buildings).toBeGreaterThan(0);
    expect(report.gains.gold.gt(0)).toBe(true);
  });
});

describe("Speichern der Erweiterungen", () => {
  it("überlebt einen Export und Import", () => {
    const s = sim((st) => {
      st.meta.embers = 4;
      st.meta.talents.spark = true;
      st.meta.runLog.push({ kind: "ritual", seconds: 1234 });
      st.factions.rep.people = -30;
      st.retinue.anselm = { level: 3, office: "chaplain", equipped: true, loyalty: 70, quest: 1, questRemaining: 12 };
      st.map.owned.push(MAP_CENTER + 1);
      st.workshop.levels.smelter = 2;
      st.workshop.ore = 1.5;
      st.autobuy.threshold = 0.3;
      st.autobuy.picks.serf = true;
      st.autobuy.recipePicks.sword = true;
    });
    const back = importSave(exportSave(s.view), 0);
    expect(back.meta.embers).toBe(4);
    expect(back.meta.talents.spark).toBe(true);
    expect(back.meta.runLog).toEqual([{ kind: "ritual", seconds: 1234 }]);
    expect(back.factions.rep.people).toBe(-30);
    expect(back.retinue.anselm).toEqual({ level: 3, office: "chaplain", equipped: true, loyalty: 70, quest: 1, questRemaining: 12 });
    expect(back.map.owned).toEqual([MAP_CENTER, MAP_CENTER + 1]);
    expect(back.workshop.levels.smelter).toBe(2);
    expect(back.workshop.ore).toBe(1.5);
    expect(back.autobuy.threshold).toBe(0.3);
    expect(back.autobuy.picks.serf).toBe(true);
    expect(back.autobuy.recipePicks.sword).toBe(true);
  });
});
