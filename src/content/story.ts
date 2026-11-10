import type { StoryNode } from "../game/story";
import { INTEL_FOR_KOMTUREI, INTEL_FOR_OUTPOST, SEALS_FOR_KOMTUREI } from "./balance";

/**
 * Story-Graph aller Akte. Reine Daten: Trigger lesen den Spielstand, Effekte verändern ihn.
 * Neue Akte werden hier angehängt; `story.test.ts` prüft den Graphen auf Konsistenz.
 */
export const STORY: readonly StoryNode[] = [
  {
    id: "a1_inheritance",
    act: 1,
    title: "Das Erbe",
    text: [
      "Der Brief trägt das Siegel deines Onkels – gebrochen, als hätte ihn schon jemand vor dir gelesen.",
      "„Vhal gehört nun dir“, steht darin. Mehr nicht. Kein Gruß, keine Warnung.",
      "Als du die Burg erreichst, findest du verkohlte Balken, einen leeren Brunnen und ein Dutzend Bauern, die dich anstarren wie einen Geist. Die Pest hat ihnen alles genommen. Außer ihren Steuerschulden.",
    ],
    requires: [],
    trigger: () => true,
    effects: [
      { kind: "unlockTile", tile: "keep" },
      { kind: "unlockTile", tile: "chronicle" },
    ],
  },
  {
    id: "a1_first_serfs",
    act: 1,
    title: "Hände im Schlamm",
    text: [
      "Zehn Leibeigene stehen nun auf deinen Äckern. Sie arbeiten schweigend.",
      "Nachts hörst du sie flüstern. Über deinen Onkel. Über das Feuer. Über das, was in der Kapelle zurückblieb.",
    ],
    requires: ["a1_inheritance"],
    trigger: (s) => s.buildings.serf >= 10,
    effects: [],
  },
  {
    id: "a1_smith",
    act: 1,
    title: "Der Schmied ohne Herrn",
    text: [
      "Ein Hüne mit verbrannten Armen klopft ans Tor. Er nennt sich Brannoc und sagt, er habe deinem Onkel gedient.",
      "„Die Schmiede steht noch“, sagt er. „Gib mir Eisen, und ich gebe dir Klingen. Du wirst sie brauchen, Herr. Bald.“",
    ],
    requires: ["a1_first_serfs"],
    trigger: (s) => s.totals.gold.gte(4_000),
    effects: [{ kind: "unlockTile", tile: "forge" }],
  },
  {
    id: "a1_first_blade",
    act: 1,
    title: "Erster Stahl",
    text: [
      "Die erste Klinge ist schartig und schwer. Brannoc wiegt sie in der Hand und nickt.",
      "Die Bauern zahlen pünktlicher, seit bewaffnete Männer am Tor stehen. Angst ist eine verlässliche Währung.",
    ],
    requires: ["a1_smith"],
    trigger: (s) => s.totals.swords.gte(1),
    effects: [],
  },
  {
    id: "a1_ledger",
    act: 1,
    title: "Das Schuldbuch",
    text: [
      "Im Kellergewölbe findest du das Rechnungsbuch deines Onkels. Die letzten Seiten sind herausgerissen.",
      "Auf der vorletzten steht nur ein Name, dreimal unterstrichen: „Der Graue Orden“.",
    ],
    requires: ["a1_first_blade"],
    trigger: (s) => s.totals.gold.gte(2_000_000),
    effects: [],
  },
  {
    id: "a1_armory",
    act: 1,
    title: "Eine Waffenkammer",
    text: [
      "Fünfzig Schwerter hängen nun an der Wand. Genug für eine kleine Wache – zu wenig für einen Krieg.",
      "Brannoc schärft schweigend weiter. Einmal fragst du ihn, wovor er sich fürchtet. Er sieht nur nach Osten.",
    ],
    requires: ["a1_first_blade"],
    trigger: (s) => s.totals.swords.gte(50),
    effects: [],
  },
  {
    id: "a1_grey_banner",
    act: 1,
    title: "Das graue Banner",
    text: [
      "Im Morgennebel erscheinen Reiter am Horizont. Ihre Banner sind grau wie Asche, ihre Rüstungen ohne Wappen.",
      "Ein Herold reitet bis an den Graben. „Der Orden fordert, was ihm geschuldet ist“, ruft er. „Ihr habt bis zum Neumond.“",
      "Hinter dir hörst du, wie Brannoc die Esse neu entfacht.",
    ],
    requires: ["a1_ledger", "a1_armory"],
    trigger: (s) => s.totals.gold.gte(25_000_000) && s.totals.swords.gte(120),
    effects: [{ kind: "setFlag", flag: "act1Complete" }],
  },

  // ── Akt II – Der Graue Orden ────────────────────────────────────────────────
  {
    id: "a2_council",
    act: 2,
    title: "Der Kriegsrat",
    text: [
      "In der Nacht nach dem Ultimatum kommt eine Frau durch das Nordtor. Ihr Mantel ist nass vom Fluss, ihre Klinge trocken.",
      "„Ich bin Sera von Dornach“, sagt sie. „Der Orden hat meine Burg verbrannt, wie die deines Onkels. Gib mir Männer, und ich zeige dir, wo er blutet.“",
      "Ihr räumt den alten Kartentisch frei. Der Staub darauf ist so dick wie Schnee.",
    ],
    requires: ["a1_grey_banner"],
    trigger: () => true,
    effects: [{ kind: "unlockTile", tile: "warroom" }],
  },
  {
    id: "a2_first_blood",
    act: 2,
    title: "Erstes Blut",
    text: [
      "Sera kehrt mit Gefangenen zurück, die Hände mit Weidenruten gebunden. Unter den Banditen trägt einer ein graues Tuch im Stiefel.",
      "„Der Orden bezahlt sie“, sagt Sera. „Sie sollen dein Land ausbluten, bevor er es nimmt.“",
      "Die Treppe zum Kerker ist seit dem Feuer nicht mehr benutzt worden. Jetzt hallen dort wieder Schritte.",
    ],
    requires: ["a2_council"],
    trigger: (s) => s.warroom.completed.bandits >= 1,
    effects: [{ kind: "unlockTile", tile: "dungeon" }],
  },
  {
    id: "a2_confession",
    act: 2,
    title: "Ein Geständnis",
    text: [
      "Der Mann mit dem grauen Tuch hält drei Tage durch. Am vierten zeichnet er mit blutigem Finger einen Turm in den Staub.",
      "„Der Vorposten“, flüstert er. „Dort zahlen sie uns aus. Dort liegen die Siegel.“",
    ],
    requires: ["a2_first_blood"],
    trigger: (s) => s.dungeon.intel >= INTEL_FOR_OUTPOST,
    effects: [{ kind: "setFlag", flag: "outpostKnown" }],
  },
  {
    id: "a2_seal",
    act: 2,
    title: "Das Siegel",
    text: [
      "Im Vorposten findet ihr eine Kiste voller Wachssiegel. Grau, ohne Wappen – bis auf eines.",
      "Es zeigt einen Hirtenstab, gekreuzt mit einem Schlüssel. Das Zeichen des Bischofs von Vhal.",
      "Du steckst es ein und sagst niemandem davon. Nicht einmal Sera.",
    ],
    requires: ["a2_confession"],
    trigger: (s) => s.warroom.seals >= 1,
    effects: [],
  },
  {
    id: "a2_traitor",
    act: 2,
    title: "Der Verräter",
    text: [
      "Die Gefangenen erzählen alle dieselbe Geschichte: Der Orden wusste immer, wann deine Wachen wechselten.",
      "Brannoc findet die Antwort. Der alte Kämmerer deines Onkels schickte jede Woche Tauben nach Grauweiler.",
      "Er gesteht, bevor man ihn fragt. „Die Komturei“, sagt er. „Dort befiehlt der Graue Meister. Aber du wirst ihn nicht töten. Niemand tötet ihn.“",
    ],
    requires: ["a2_seal"],
    trigger: (s) => s.dungeon.intel >= INTEL_FOR_KOMTUREI && s.warroom.seals >= SEALS_FOR_KOMTUREI,
    effects: [{ kind: "setFlag", flag: "komtureiKnown" }],
  },
  {
    id: "a2_komturei",
    act: 2,
    title: "Die Komturei fällt",
    text: [
      "Grauweiler brennt die ganze Nacht. Am Morgen steht Sera vor dem Thron des Grauen Meisters – und der Thron ist leer.",
      "Unter der Komturei führt eine Treppe in die Tiefe. Von unten weht kalte Luft herauf, und mit ihr ein Flüstern, das deinen Namen kennt.",
      "„Er ist nicht geflohen“, sagt Sera leise. „Er ist hinabgestiegen.“ Ihr Blick wandert nach Westen. Nach Vhal. Zu der verriegelten Tür unter deiner eigenen Kapelle.",
    ],
    requires: ["a2_traitor"],
    trigger: (s) => s.warroom.completed.komturei >= 1,
    effects: [{ kind: "setFlag", flag: "act2Complete" }],
  },
];
