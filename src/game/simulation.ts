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
    this.state.stats.playSeconds += dt;

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
    this.advanceStory();
  }

  dispatch(action: Action): Result {
    const result = action.type === "resolveEvent" ? resolveEvent(this.state, action.choice, this.rates) : applyAction(this.state, action);
    // Neues Spiel+ ersetzt die Story: der Director muss seine Grenze neu bestimmen.
    if (result.ok && action.type === "newGamePlus") this.director.sync(this.state);
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
    if (done.length === 0 && earned.length === 0) return;
    this.invalidate();
    for (const node of done) this.events.emit("story", node);
    for (const id of earned) this.events.emit("achievement", id);
  }

  storyNode(id: string): StoryNode | undefined {
    return this.director.node(id);
  }
}
