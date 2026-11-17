import type { TileId } from "./ids";

/** Kurzer Tipp beim ersten Öffnen jeder Kachel (deutscher Text = Übersetzungsschlüssel). */
export const TILE_HINTS: Readonly<Record<TileId, string>> = {
  keep: "Treib Steuern ein und kauf Leibeigene. Jedes Gebäude arbeitet auch, wenn du gerade nicht hinsiehst.",
  forge: "Erzstollen fördern Eisen, die Esse macht daraus Schwerter. Jede Klinge in der Waffenkammer erhöht dein Gold.",
  warroom: "Rekrutiere Soldaten und schick sie auf Expeditionen. Dort fallen Männer, aber es winken Beute, Gefangene und Ordenssiegel.",
  dungeon: "Verhöre Gefangene, um neue Ziele zu finden. Wer genug weiß, zwingt den Rest zur Fron.",
  crypt: "Deine Gefallenen liefern Seelen. Mit Seelen kaufst du Totenlichter und schließt Pakte, die alles vervielfachen.",
  alchemy: "Forschungen kosten Gold, Seelen und Geduld. Es läuft immer nur eine – wähl mit Bedacht.",
  chapel: "Glaube öffnet Gelübde: Jedes schenkt einen Segen und verlangt einen Fluch. Altäre sind knapp.",
  ritual: "Das Ritual brennt Vhal nieder und schenkt dir Asche. Asche macht jeden Neuanfang schneller.",
  chronicle: "Hier stehen Geschichte, Erfolge und Einstellungen. Hier speicherst, exportierst und wechselst du Spielstände.",
};
