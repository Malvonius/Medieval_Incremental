import type { Decimal } from "../core/decimal";
import type { DeepReadonly } from "../core/types";
import type { FlagId, ResourceId, TileId } from "../content/ids";
import { type GameState, gain } from "./state";

export type StoryEffect =
  | { readonly kind: "unlockTile"; readonly tile: TileId }
  | { readonly kind: "setFlag"; readonly flag: FlagId }
  | { readonly kind: "grant"; readonly resource: ResourceId; readonly amount: Decimal };

export interface StoryNode {
  readonly id: string;
  readonly act: 1 | 2 | 3 | 4 | 5;
  readonly title: string;
  /** Absätze des Erzähltexts. */
  readonly text: readonly string[];
  readonly requires: readonly string[];
  /** Reine Funktion über den Spielstand – keine Seiteneffekte. */
  readonly trigger: (state: DeepReadonly<GameState>) => boolean;
  readonly effects: readonly StoryEffect[];
}

function applyEffect(state: GameState, effect: StoryEffect): void {
  switch (effect.kind) {
    case "unlockTile":
      state.tiles[effect.tile] = true;
      return;
    case "setFlag":
      state.flags[effect.flag] = true;
      return;
    case "grant":
      gain(state, effect.resource, effect.amount);
      return;
    default: {
      const unreachable: never = effect;
      throw new Error(`Unbekannter Story-Effekt: ${JSON.stringify(unreachable)}`);
    }
  }
}

/**
 * Wertet nur die „Grenze“ des Quest-Graphen aus: Knoten, deren Vorgänger erfüllt sind.
 * Kosten pro Tick: O(|Grenze|) statt O(|alle Knoten|).
 */
export class StoryDirector {
  private readonly byId: ReadonlyMap<string, StoryNode>;
  private completed = new Set<string>();
  private frontier: StoryNode[] = [];

  constructor(private readonly nodes: readonly StoryNode[]) {
    const byId = new Map<string, StoryNode>();
    for (const node of nodes) {
      if (byId.has(node.id)) throw new Error(`Doppelte Story-ID: ${node.id}`);
      byId.set(node.id, node);
    }
    for (const node of nodes) {
      for (const req of node.requires) {
        if (!byId.has(req)) throw new Error(`Story-Knoten ${node.id} verlangt unbekannten Knoten ${req}`);
      }
    }
    this.byId = byId;
  }

  node(id: string): StoryNode | undefined {
    return this.byId.get(id);
  }

  /** Nach dem Laden eines Spielstands aufrufen. Unbekannte IDs (aus alten Versionen) werden ignoriert. */
  sync(state: Readonly<GameState>): void {
    this.completed = new Set(state.story.completed.filter((id) => this.byId.has(id)));
    this.rebuildFrontier();
  }

  private rebuildFrontier(): void {
    this.frontier = this.nodes.filter(
      (n) => !this.completed.has(n.id) && n.requires.every((req) => this.completed.has(req)),
    );
  }

  /** Schließt alle erfüllten Knoten ab, auch Ketten im selben Tick. Gibt sie in Reihenfolge zurück. */
  evaluate(state: GameState): StoryNode[] {
    const done: StoryNode[] = [];
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const node of this.frontier) {
        if (!node.trigger(state)) continue;
        this.completed.add(node.id);
        state.story.completed.push(node.id);
        for (const effect of node.effects) applyEffect(state, effect);
        done.push(node);
        progressed = true;
      }
      if (progressed) this.rebuildFrontier();
    }
    return done;
  }
}
