import { Decimal } from "../core/decimal";
import {
  BUILDINGS,
  BUILDING_IDS,
  type BuildingId,
  FORGE_QUEUE_CAPACITY,
  RECIPES,
  UPGRADES,
  UPGRADE_IDS,
  type UpgradeId,
} from "../content/balance";
import type { Action } from "../game/actions";
import { canAffordRecipe } from "../game/forge";
import { buildingCost, buildingMultiplier, clickValue, craftDuration, isUpgradeVisible, unitRate } from "../game/rates";
import { Simulation } from "../game/simulation";
import { createInitialState } from "../game/state";

export interface BotOptions {
  /** Abbruch nach dieser simulierten Spielzeit. */
  readonly maxSeconds: number;
  /** Klicks pro Sekunde auf „Steuern eintreiben“. Menschen klicken anfangs, später kaum noch. */
  readonly clicksPerSecond?: number;
  /** Simulation endet, sobald dieser Story-Knoten erreicht ist. */
  readonly stopAtNode?: string;
}

export interface Milestone {
  readonly id: string;
  readonly title: string;
  readonly act: number;
  readonly seconds: number;
}

export interface BotResult {
  readonly milestones: readonly Milestone[];
  readonly seconds: number;
  readonly reachedStop: boolean;
  readonly sim: Simulation;
}

/** Ausgaben für Hilfsgüter (Eisen, Schmiedetempo) dürfen höchstens so viele Sekunden Goldeinkommen kosten. */
const SUPPORT_BUDGET_SECONDS = 90;
const MAX_ACTIONS_PER_STEP = 200;

interface Candidate {
  readonly action: Action;
  readonly cost: Decimal;
  /** Zusätzliches Gold pro Sekunde durch den Kauf. */
  readonly gain: Decimal;
}

const isGoldBuilding = (id: BuildingId): boolean => BUILDINGS[id].produces === "gold";

/**
 * Gieriger Referenzspieler: wählt den Kauf mit der kürzesten Zeit bis zur Amortisation
 * (Wartezeit + Kosten / Ertragszuwachs) und wartet, bis er ihn bezahlen kann.
 * Er ist bewusst „gut, aber nicht perfekt“ – ein Maßstab fürs Pacing, kein Optimierer.
 */
class GreedyBot {
  constructor(
    private readonly sim: Simulation,
    private readonly clicksPerSecond: number,
  ) {}

  private goldCandidates(): Candidate[] {
    const s = this.sim.view;
    const out: Candidate[] = [];
    for (const id of BUILDING_IDS) {
      if (!isGoldBuilding(id) || !s.tiles[BUILDINGS[id].tile]) continue;
      out.push({ action: { type: "buyBuilding", building: id, amount: 1 }, cost: buildingCost(s, id, 1), gain: unitRate(s, id) });
    }
    for (const id of UPGRADE_IDS) {
      if (!isUpgradeVisible(s, id)) continue;
      const gain = this.upgradeGoldGain(id);
      if (gain === null) continue;
      out.push({ action: { type: "buyUpgrade", upgrade: id }, cost: new Decimal(UPGRADES[id].cost), gain });
    }
    return out;
  }

  private upgradeGoldGain(id: UpgradeId): Decimal | null {
    const s = this.sim.view;
    const effect = UPGRADES[id].effect;
    switch (effect.kind) {
      case "buildingMult":
        if (!isGoldBuilding(effect.building)) return null;
        return unitRate(s, effect.building).mul(s.buildings[effect.building] * (effect.factor - 1));
      case "clickMult":
        return clickValue(s).mul(this.clicksPerSecond * (effect.factor - 1));
      case "craftSpeed":
        return null;
    }
  }

  /** Eisenversorgung und Schmiedetempo: gekauft, sobald günstig im Verhältnis zum Einkommen. */
  private supportAction(): Action | null {
    const s = this.sim.view;
    if (!s.tiles.forge) return null;
    const budget = this.sim.rates.gold.mul(SUPPORT_BUDGET_SECONDS);
    const gold = s.resources.gold;

    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      if (!isUpgradeVisible(s, id)) continue;
      const support =
        def.effect.kind === "craftSpeed" || (def.effect.kind === "buildingMult" && !isGoldBuilding(def.effect.building));
      if (support && gold.gte(def.cost) && budget.gte(def.cost)) return { type: "buyUpgrade", upgrade: id };
    }

    const sword = RECIPES.sword;
    const neededIron = sword.inputs.iron / craftDuration(s, "sword");
    const ironRate = this.sim.rates.iron;
    const mineCost = buildingCost(s, "mine", 1);
    const mineRate = sword.inputs.iron > 0 ? BUILDINGS.mine.baseRate * buildingMultiplier(s, "mine") : 0;
    if (ironRate.lt(neededIron) && gold.gte(mineCost) && (budget.gte(mineCost) || ironRate.add(mineRate).lte(0.5))) {
      return { type: "buyBuilding", building: "mine", amount: 1 };
    }

    if (s.forge.queue.length < FORGE_QUEUE_CAPACITY && canAffordRecipe(s, "sword", 1)) {
      const goldShare = new Decimal(sword.inputs.gold);
      if (budget.gte(goldShare) || gold.gte(goldShare.mul(4))) return { type: "craft", recipe: "sword", amount: 1 };
    }
    return null;
  }

  private bestGoldAction(): Action | null {
    const s = this.sim.view;
    const income = this.sim.rates.gold.add(clickValue(s).mul(this.clicksPerSecond));
    let best: { action: Action; affordable: boolean; score: number } | null = null;

    for (const c of this.goldCandidates()) {
      if (c.gain.lte(0)) continue;
      const missing = Decimal.max(c.cost.sub(s.resources.gold), 0);
      const wait = income.gt(0) ? missing.div(income).toNumber() : Number.POSITIVE_INFINITY;
      const score = wait + c.cost.div(c.gain).toNumber();
      if (best === null || score < best.score) best = { action: c.action, affordable: missing.lte(0), score };
    }
    return best?.affordable ? best.action : null;
  }

  step(): void {
    for (let i = 0; i < this.clicksPerSecond; i += 1) this.sim.dispatch({ type: "collect" });
    for (let i = 0; i < MAX_ACTIONS_PER_STEP; i += 1) {
      const action = this.supportAction() ?? this.bestGoldAction();
      if (action === null) return;
      const result = this.sim.dispatch(action);
      if (!result.ok) throw new Error(`Bot wählte ungültige Aktion ${JSON.stringify(action)}: ${result.reason}`);
    }
  }
}

export function runBot(options: BotOptions): BotResult {
  const { maxSeconds, clicksPerSecond = 3, stopAtNode } = options;
  if (!(maxSeconds > 0)) throw new RangeError("maxSeconds muss > 0 sein");
  if (!Number.isSafeInteger(clicksPerSecond) || clicksPerSecond < 0) throw new RangeError("clicksPerSecond muss eine Ganzzahl ≥ 0 sein");

  const sim = new Simulation(createInitialState(0));
  const milestones: Milestone[] = [];
  let reachedStop = false;
  let seconds = 0;
  sim.events.on("story", (node) => {
    milestones.push({ id: node.id, title: node.title, act: node.act, seconds });
    if (node.id === stopAtNode) reachedStop = true;
  });

  const bot = new GreedyBot(sim, clicksPerSecond);
  // Der erste Knoten triggert bedingungslos – mit dem ersten Tick.
  sim.tick(1e-3);
  while (seconds < maxSeconds && !reachedStop) {
    bot.step();
    sim.tick(1);
    seconds += 1;
  }
  return { milestones, seconds, reachedStop, sim };
}
