import type { Component } from "svelte";
import type { GameController } from "../../app/controller";
import type { TileId } from "../../content/ids";
import ChroniclePanel from "./ChroniclePanel.svelte";
import ForgePanel from "./ForgePanel.svelte";
import KeepPanel from "./KeepPanel.svelte";

export interface TileView {
  readonly id: TileId;
  readonly title: string;
  readonly glyph: string;
  /** Rätselhafter Hinweis, solange die Kachel versiegelt ist. */
  readonly sealedHint: string;
  /** null = Inhalt folgt in einem späteren Akt. */
  readonly Panel: Component<{ game: GameController }> | null;
}

export const TILES: readonly TileView[] = [
  { id: "keep", title: "Burgfried", glyph: "♜", sealedHint: "", Panel: KeepPanel },
  { id: "forge", title: "Schmiede", glyph: "⚒", sealedHint: "Kalte Asche in einer verlassenen Esse.", Panel: ForgePanel },
  { id: "warroom", title: "Kriegsrat", glyph: "⚔", sealedHint: "Ein Kartentisch, bedeckt mit Staub.", Panel: null },
  { id: "dungeon", title: "Kerker", glyph: "⛓", sealedHint: "Von unten dringt leises Kettenrasseln.", Panel: null },
  { id: "crypt", title: "Krypta", glyph: "☠", sealedHint: "Die Tür ist von innen verriegelt.", Panel: null },
  { id: "alchemy", title: "Alchemistenturm", glyph: "⚗", sealedHint: "Grünes Licht flackert hinter den Scheiben.", Panel: null },
  { id: "chapel", title: "Kapelle", glyph: "✝", sealedHint: "Die Glocke schweigt seit dem Feuer.", Panel: null },
  { id: "ritual", title: "Ritual der Asche", glyph: "✶", sealedHint: "Ein Kreis aus Ruß auf kaltem Stein.", Panel: null },
  { id: "chronicle", title: "Chronik", glyph: "❦", sealedHint: "", Panel: ChroniclePanel },
];
