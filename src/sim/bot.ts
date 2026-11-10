import { Decimal } from "../core/decimal";
import {
  BUILDINGS,
  BUILDING_IDS,
  type BuildingId,
  EXPEDITIONS,
  EXPEDITION_IDS,
  INTEL_FOR_KOMTUREI,
  type ExpeditionId,
  RECIPES,
  RESEARCH,
  RESEARCH_IDS,
  type ResearchId,
  UPGRADES,
  UPGRADE_IDS,
  type UpgradeEffect,
  type UpgradeId,
} from "../content/balance";
import type { Action } from "../game/actions";
import { researchStatus } from "../game/alchemy";
import { canAffordRecipe } from "../game/forge";
import {
  buildingCost,
  buildingMultiplier,
  clickValue,
  craftDuration,
  forgeCapacity,
  isBuildingVisible,
  isUpgradeVisible,
  recruitCost,
  unitRate,
} from "../game/rates";
import { Simulation } from "../game/simulation";
import { createInitialState } from "../game/state";
import { launchBlocker } from "../game/warroom";

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

/** Ausgaben für Hilfsgüter (Eisen, Soldaten, Tempo) dürfen höchstens so viele Sekunden Goldeinkommen kosten. */
const SUPPORT_BUDGET_SECONDS = 90;
const MAX_ACTIONS_PER_STEP = 200;
/** Eine Forschung, deren Kosten innerhalb dieser Sekunden Einkommen erreichbar sind, wird angespart. */
const RESEARCH_SAVE_SECONDS = 600;
/** Sold für einen Rekruten darf höchstens so viele Sekunden Goldeinkommen kosten – sonst verhungert die Wirtschaft. */
const RECRUIT_BUDGET_SECONDS = 25;

/** Ziele nach Wichtigkeit: das größte erreichbare zuerst. */
const EXPEDITIONS_BY_SIZE: readonly ExpeditionId[] = [...EXPEDITION_IDS].sort(
  (a, b) => EXPEDITIONS[b].soldiers - EXPEDITIONS[a].soldiers,
);

interface Candidate {
  readonly action: Action;
  readonly cost: Decimal;
  /** Zusätzliches Gold pro Sekunde durch den Kauf. */
  readonly gain: Decimal;
}

const isGoldBuilding = (id: BuildingId): boolean => BUILDINGS[id].produces === "gold";

/** Upgrades, deren Nutzen sich nicht direkt in Gold/s ausdrücken lässt. */
const isSupportEffect = (effect: UpgradeEffect): boolean =>
  effect.kind !== "clickMult" &&
  !(effect.kind === "buildingMult" && isGoldBuilding(effect.building)) &&
  !(effect.kind === "resourceMult" && effect.resource === "gold");

/**
 * Gieriger Referenzspieler: wählt den Goldkauf mit der kürzesten Zeit bis zur Amortisation
 * (Wartezeit + Kosten / Ertragszuwachs) und wartet, bis er ihn bezahlen kann. Hilfskäufe
 * (Eisen, Schmiede, Soldaten, Expeditionen, Kerker) folgen festen, einfachen Regeln.
 * Er ist bewusst „gut, aber nicht perfekt“ – ein Maßstab fürs Pacing, kein Optimierer.
 */
class GreedyBot {
  /** Währungen, die gerade für eine Forschung angespart werden. */
  private saving = { gold: false, souls: false };

  constructor(
    private readonly sim: Simulation,
    private readonly clicksPerSecond: number,
  ) {}

  /** Wählt die günstigste erreichbare Forschung und spart die fehlende Währung dafür an. */
  private researchAction(): Action | null {
    const s = this.sim.view;
    this.saving = { gold: false, souls: false };
    if (!s.tiles.alchemy || s.alchemy.active !== null) return null;

    let target: ResearchId | null = null;
    for (const id of RESEARCH_IDS) {
      const status = researchStatus(s, id);
      if (status === "ready") return { type: "research", research: id };
      if (status !== "poor") continue;
      if (target === null || RESEARCH[id].gold < RESEARCH[target].gold) target = id;
    }
    if (target === null) return null;

    const def = RESEARCH[target];
    const rates = this.sim.rates;
    const reachable =
      rates.gold.mul(RESEARCH_SAVE_SECONDS).add(s.resources.gold).gte(def.gold) &&
      rates.souls.mul(RESEARCH_SAVE_SECONDS).add(s.resources.souls).gte(def.souls);
    if (reachable) this.saving = { gold: s.resources.gold.lt(def.gold), souls: s.resources.souls.lt(def.souls) };
    return null;
  }

  /** Seelen: Gebäude und Seelen-Pakte nach Amortisation, Gold/Eisen-Pakte sobald bezahlbar. */
  private soulAction(): Action | null {
    const s = this.sim.view;
    if (!s.tiles.crypt || this.saving.souls) return null;
    const souls = s.resources.souls;

    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      const effect: UpgradeEffect = def.effect;
      if (def.costResource !== "souls" || !isUpgradeVisible(s, id)) continue;
      if (effect.kind === "resourceMult" && effect.resource !== "souls" && souls.gte(def.cost)) {
        return { type: "buyUpgrade", upgrade: id };
      }
    }

    const income = this.sim.rates.souls;
    let best: { action: Action; affordable: boolean; score: number } | null = null;
    const consider = (action: Action, cost: Decimal, gain: Decimal): void => {
      if (gain.lte(0)) return;
      const missing = Decimal.max(cost.sub(souls), 0);
      const wait = income.gt(0) ? missing.div(income).toNumber() : Number.POSITIVE_INFINITY;
      const score = wait + cost.div(gain).toNumber();
      if (best === null || score < best.score) best = { action, affordable: missing.lte(0), score };
    };
    for (const id of BUILDING_IDS) {
      if (BUILDINGS[id].costResource !== "souls" || !isBuildingVisible(s, id)) continue;
      consider({ type: "buyBuilding", building: id, amount: 1 }, buildingCost(s, id, 1), unitRate(s, id));
    }
    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      const effect: UpgradeEffect = def.effect;
      if (def.costResource !== "souls" || !isUpgradeVisible(s, id)) continue;
      if (effect.kind === "resourceMult" && effect.resource === "souls") {
        consider({ type: "buyUpgrade", upgrade: id }, new Decimal(def.cost), income.mul(effect.factor - 1));
      }
    }
    const chosen = best as { action: Action; affordable: boolean } | null;
    return chosen?.affordable ? chosen.action : null;
  }

  private get budget(): Decimal {
    return this.sim.rates.gold.mul(SUPPORT_BUDGET_SECONDS);
  }

  private goldCandidates(): Candidate[] {
    const s = this.sim.view;
    const out: Candidate[] = [];
    for (const id of BUILDING_IDS) {
      if (!isGoldBuilding(id) || BUILDINGS[id].costResource !== "gold" || !isBuildingVisible(s, id)) continue;
      out.push({ action: { type: "buyBuilding", building: id, amount: 1 }, cost: buildingCost(s, id, 1), gain: unitRate(s, id) });
    }
    for (const id of UPGRADE_IDS) {
      if (UPGRADES[id].costResource !== "gold" || !isUpgradeVisible(s, id)) continue;
      const gain = this.upgradeGoldGain(id);
      if (gain === null) continue;
      out.push({ action: { type: "buyUpgrade", upgrade: id }, cost: new Decimal(UPGRADES[id].cost), gain });
    }
    return out;
  }

  private upgradeGoldGain(id: UpgradeId): Decimal | null {
    const s = this.sim.view;
    const effect: UpgradeEffect = UPGRADES[id].effect;
    if (effect.kind === "clickMult") return clickValue(s).mul(this.clicksPerSecond * (effect.factor - 1));
    if (effect.kind === "buildingMult" && isGoldBuilding(effect.building)) {
      return unitRate(s, effect.building).mul(s.buildings[effect.building] * (effect.factor - 1));
    }
    if (effect.kind === "resourceMult" && effect.resource === "gold") return this.sim.rates.gold.mul(effect.factor - 1);
    return null;
  }

  private supportUpgrade(): Action | null {
    const s = this.sim.view;
    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      if (def.costResource !== "gold" || !isUpgradeVisible(s, id) || !isSupportEffect(def.effect)) continue;
      if (s.resources.gold.gte(def.cost) && this.budget.gte(def.cost)) return { type: "buyUpgrade", upgrade: id };
    }
    return null;
  }

  private forgeAction(): Action | null {
    const s = this.sim.view;
    if (!s.tiles.forge) return null;
    const gold = s.resources.gold;
    const sword = RECIPES.sword;
    const neededIron = sword.inputs.iron / craftDuration(s, "sword");
    const ironRate = this.sim.rates.iron;
    const mineCost = buildingCost(s, "mine", 1);
    const mineRate = BUILDINGS.mine.baseRate * buildingMultiplier(s, "mine");
    if (ironRate.lt(neededIron) && gold.gte(mineCost) && (this.budget.gte(mineCost) || ironRate.add(mineRate).lte(0.5))) {
      return { type: "buyBuilding", building: "mine", amount: 1 };
    }
    if (s.forge.queue.length < forgeCapacity(s) && canAffordRecipe(s, "sword", 1)) {
      const goldShare = new Decimal(sword.inputs.gold);
      if (this.budget.gte(goldShare) || gold.gte(goldShare.mul(4))) return { type: "craft", recipe: "sword", amount: 1 };
    }
    return null;
  }

  private launchAction(): Action | null {
    const s = this.sim.view;
    if (!s.tiles.warroom) return null;
    // Ist ein einmaliges Hauptziel bekannt, hält der Bot seine Truppen dafür zusammen.
    const mainTarget = EXPEDITIONS_BY_SIZE.find((id) => !EXPEDITIONS[id].repeatable && launchBlocker(s, id) === "soldiers");
    for (const id of EXPEDITIONS_BY_SIZE) {
      if (mainTarget !== undefined && id !== mainTarget) continue;
      if (launchBlocker(s, id) === null) return { type: "launchExpedition", expedition: id };
    }
    return null;
  }

  private recruitAction(): Action | null {
    const s = this.sim.view;
    if (!s.tiles.warroom) return null;
    if (s.resources.swords.gte(1)) {
      const cost = recruitCost(s, 1);
      if (s.resources.gold.gte(cost) && this.sim.rates.gold.mul(RECRUIT_BUDGET_SECONDS).gte(cost)) return { type: "recruit", amount: 1 };
    }
    return null;
  }

  private dungeonAction(): Action | null {
    const { dungeon, tiles } = this.sim.view;
    if (!tiles.dungeon || dungeon.prisoners === 0) return null;
    return dungeon.intel < INTEL_FOR_KOMTUREI
      ? { type: "interrogate", amount: dungeon.prisoners }
      : { type: "forceLabor", amount: dungeon.prisoners };
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

  private nextAction(): Action | null {
    const research = this.researchAction();
    if (research) return research;
    const launch = this.launchAction();
    if (launch) return launch;
    const goldSpending = this.saving.gold
      ? null
      : (this.recruitAction() ?? this.supportUpgrade() ?? this.forgeAction() ?? this.bestGoldAction());
    return this.dungeonAction() ?? this.soulAction() ?? goldSpending;
  }

  step(): void {
    for (let i = 0; i < this.clicksPerSecond; i += 1) this.sim.dispatch({ type: "collect" });
    for (let i = 0; i < MAX_ACTIONS_PER_STEP; i += 1) {
      const action = this.nextAction();
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
