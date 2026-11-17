import { EventBus } from "../core/events";
import type { DeepReadonly, Result } from "../core/types";
import { RESOURCE_IDS } from "../content/ids";
import { STORY } from "../content/story";
import { type Action, applyAction } from "./actions";
import type { ExpeditionId, ResearchId } from "../content/balance";
import { tickForge } from "./forge";
import { type Rates, computeRates } from "./rates";
import { type GameState, gain } from "./state";
import { tickWarroom } from "./warroom";
import { tickAlchemy } from "./alchemy";
import { tickSiege } from "./siege";
import { resolveEvent, tickAutomation, tickEvents } from "./depth";
import { evaluateAchievements } from "./achievements";
import type { AchievementId } from "../content/achievements";
import { type StoryNode, StoryDirector } from "./story";
import { evaluateCodex, tickAutobuy, tickWorkshop, unlockExtras } from "./extensions";
import type { CodexId, RetainerId } from "../content/extensions";
import { RETAINER_IDS } from "../content/extensions";
import { type QuestDone, pokeRaven, seasonOf, tickMerchant, tickQuests, tickRaven } from "./living";

export type Completion =
  | { readonly kind: "expedition"; readonly id: ExpeditionId }
  | { readonly kind: "research"; readonly id: ResearchId }
  | { readonly kind: "battle"; readonly wave: number };

export interface SimulationEvents extends Record<string, unknown> {
  story: StoryNode;
  achievement: AchievementId;
  /** Etwas Langwieriges ist fertig – Anlass für eine Browser-Benachrichtigung. */
  completed: Completion;
  /** Erfolgreich ausgeführte Spieleraktion – z. B. für Sound. */
  action: Action["type"];
  codex: CodexId;
  /** Ein Gefolgsauftrag ist erfüllt – Anlass für eine kleine Geschichte. */
  quest: QuestDone;
  /** Eine Person hat das Gefolge im Zorn verlassen. */
  departed: RetainerId;
}

/**
 * Deterministischer Simulationskern ohne DOM-Abhängigkeit.
 * Der State wird intern aus Performancegründen mutiert; nach außen gibt es nur eine read-only-Sicht.
 */
export class Simulation {
  readonly events = new EventBus<SimulationEvents>();
  private readonly director: StoryDirector;
  private cachedRates: Rates | null = null;

  constructor(
    private readonly state: GameState,
    story: readonly StoryNode[] = STORY,
  ) {
    this.director = new StoryDirector(story);
    this.director.sync(state);
  }

  get view(): DeepReadonly<GameState> {
    return this.state;
  }

  get rates(): Rates {
    this.cachedRates ??= computeRates(this.state);
    return this.cachedRates;
  }

  private invalidate(): void {
    this.cachedRates = null;
  }

  tick(dt: number): void {
    if (!(dt > 0) || !Number.isFinite(dt)) throw new RangeError(`dt muss endlich und > 0 sein, war ${dt}`);
    const rates = this.rates;
    for (const resource of RESOURCE_IDS) gain(this.state, resource, rates[resource].mul(dt));
    const seasonBefore = seasonOf(this.state.stats.playSeconds);
    this.state.stats.playSeconds += dt;
    if (seasonOf(this.state.stats.playSeconds) !== seasonBefore) this.invalidate();

    const expeditionsBefore = this.state.warroom.active.map((e) => e.id);
    const researchBefore = this.state.alchemy.active?.id ?? null;
    const waveBefore = this.state.siege.wave;

    if (tickForge(this.state, dt)) this.invalidate();
    if (tickWarroom(this.state, dt, rates.gold)) this.invalidate();
    if (tickAlchemy(this.state, dt)) this.invalidate();
    if (tickSiege(this.state, dt)) this.invalidate();

    for (const id of expeditionsBefore) {
      if (!this.state.warroom.active.some((e) => e.id === id)) this.events.emit("completed", { kind: "expedition", id });
    }
    if (researchBefore !== null && this.state.alchemy.completed[researchBefore]) {
      this.events.emit("completed", { kind: "research", id: researchBefore });
    }
    if (this.state.siege.wave > waveBefore) this.events.emit("completed", { kind: "battle", wave: waveBefore });
    if (tickEvents(this.state, dt)) this.invalidate();
    if (tickAutomation(this.state, dt)) this.invalidate();
    if (tickAutobuy(this.state, dt)) this.invalidate();
    if (tickWorkshop(this.state, dt)) this.invalidate();
    tickRaven(this.state, dt);
    tickMerchant(this.state, dt, rates);
    const quests = tickQuests(this.state, dt);
    if (quests.length > 0) this.invalidate();
    for (const done of quests) this.events.emit("quest", done);
    this.advanceStory();
  }

  dispatch(action: Action): Result {
    const hiredBefore = RETAINER_IDS.filter((id) => this.state.retinue[id] !== null);
    const result =
      action.type === "resolveEvent"
        ? resolveEvent(this.state, action.choice, this.rates)
        : action.type === "pokeRaven"
          ? pokeRaven(this.state, this.rates)
          : applyAction(this.state, action);
    for (const id of hiredBefore) if (this.state.retinue[id] === null) this.events.emit("departed", id);
    // Neues Spiel+ ersetzt die Story: der Director muss seine Grenze neu bestimmen.
    if (result.ok && (action.type === "newGamePlus" || action.type === "ascend")) this.director.sync(this.state);
    if (result.ok) {
      this.events.emit("action", action.type);
      this.invalidate();
      this.advanceStory();
    }
    return result;
  }

  /** Markiert den Zeitpunkt des Speicherns; einzige Mutation, die nicht aus dem Spiel selbst kommt. */
  touch(now: number): void {
    this.state.lastSeen = now;
  }

  private advanceStory(): void {
    const done = this.director.evaluate(this.state);
    const earned = evaluateAchievements(this.state);
    const unlockedExtra = unlockExtras(this.state);
    const lore = evaluateCodex(this.state);
    if (done.length === 0 && earned.length === 0 && !unlockedExtra && lore.length === 0) return;
    this.invalidate();
    for (const node of done) this.events.emit("story", node);
    for (const id of earned) this.events.emit("achievement", id);
    for (const id of lore) this.events.emit("codex", id);
  }

  storyNode(id: string): StoryNode | undefined {
    return this.director.node(id);
  }
}
