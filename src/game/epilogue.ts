import { Story } from "inkjs";
import type { DeepReadonly } from "../core/types";
import type { GameState } from "./state";

export interface InkStep {
  readonly paragraphs: readonly string[];
  readonly choices: readonly string[];
  readonly done: boolean;
}

/** Dünne Hülle um die Ink-Laufzeit: Variablen aus dem Spielstand setzen, Text und Wahlen abrufen. */
export class Epilogue {
  private readonly story: Story;

  constructor(json: string, state: DeepReadonly<GameState>) {
    this.story = new Story(json);
    const vars = this.story.variablesState;
    vars["ending"] = state.siege.ending ?? "light";
    vars["trust_sera"] = state.flags.trustSera;
    vars["trust_ilse"] = state.flags.trustIlse;
    vars["ng_plus"] = state.meta.ngPlus;
  }

  next(): InkStep {
    const paragraphs: string[] = [];
    while (this.story.canContinue) {
      const line = (this.story.Continue() ?? "").trim();
      if (line) paragraphs.push(line);
    }
    const choices = this.story.currentChoices.map((c) => c.text);
    return { paragraphs, choices, done: choices.length === 0 };
  }

  choose(index: number): InkStep {
    if (index < 0 || index >= this.story.currentChoices.length) throw new RangeError(`Ungültige Wahl ${index}`);
    this.story.ChooseChoiceIndex(index);
    return this.next();
  }
}
