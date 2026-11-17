import battlefield from "./battlefield.svg";
import chapel from "./chapel.svg";
import crypt from "./crypt.svg";
import hall from "./hall.svg";
import maptable from "./maptable.svg";
import ruin from "./ruin.svg";

/** Gemalte Hintergründe der Story-Szenen: je Akt ein Schauplatz, Gefolgsaufträge im Rittersaal. */
const BY_ACT = [ruin, maptable, crypt, chapel, battlefield] as const;

export function backdropFor(nodeId: string, act: number): string {
  if (nodeId.startsWith("quest_")) return hall;
  return BY_ACT[act - 1] ?? ruin;
}
