import type { StoryNode } from "../game/story";

/**
 * Akt I – „Die Ruine“. Reine Daten: Trigger lesen den Spielstand, Effekte verändern ihn.
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
];
