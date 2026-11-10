import type { StoryNode } from "../game/story";
import { INTEL_FOR_KOMTUREI, INTEL_FOR_OUTPOST, SEALS_FOR_KOMTUREI } from "./balance";
import { completedResearchCount } from "../game/alchemy";

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

  // ── Akt III – Was unter der Erde liegt ──────────────────────────────────────
  {
    id: "a3_descent",
    act: 3,
    title: "Die Tür unter der Kapelle",
    text: [
      "Der Riegel ist von innen vorgeschoben. Brannoc braucht eine Nacht und drei Meißel, um ihn zu brechen.",
      "Dahinter führt eine Wendeltreppe hinab, tiefer, als die Burg hoch ist. Die Wände sind mit Knochen ausgekleidet, Schädel an Schädel, und ganz unten liegen die Neuen: deine Gefallenen aus dem Krieg gegen den Orden.",
      "Niemand hat sie hergebracht. Sie waren einfach da.",
    ],
    requires: ["a2_komturei"],
    trigger: () => true,
    effects: [{ kind: "unlockTile", tile: "crypt" }],
  },
  {
    id: "a3_first_souls",
    act: 3,
    title: "Was bleibt",
    text: [
      "In der Krypta ist es nie ganz dunkel. Zwischen den Gebeinen glimmt ein fahles Licht, das sich bewegt, wenn du nicht hinsiehst.",
      "Sera weigert sich, hinabzusteigen. „Das sind Seelen“, sagt sie. „Und jemand hat gelernt, sie zu halten.“",
    ],
    requires: ["a3_descent"],
    trigger: (s) => s.totals.souls.gte(200),
    effects: [],
  },
  {
    id: "a3_alchemist",
    act: 3,
    title: "Magistra Ilse Varn",
    text: [
      "Der Alchemistenturm stand leer, seit dein Onkel starb. Jetzt brennt dort Licht.",
      "Die Frau, die oben auf dich wartet, hat grüne Fingerkuppen und keine Augenbrauen. „Ich habe für deinen Onkel gearbeitet“, sagt sie. „Er wollte wissen, was der Orden mit den Toten macht. Er hat es herausgefunden.“",
      "Sie deutet auf einen Kessel, unter dem kein Feuer brennt und der trotzdem kocht. „Bring mir Seelen. Dann zeige ich dir, wie er gestorben ist.“",
    ],
    requires: ["a3_first_souls"],
    trigger: (s) => s.totals.souls.gte(3_000),
    effects: [{ kind: "unlockTile", tile: "alchemy" }],
  },
  {
    id: "a3_first_work",
    act: 3,
    title: "Das erste Werk",
    text: [
      "Ilse Varn arbeitet drei Tage ohne Schlaf. Als sie den Kolben öffnet, riecht der Turm nach Eisen und Regen.",
      "„Die Alchemie ist kein Zauber“, sagt sie. „Sie ist eine Rechnung. Und irgendwer zahlt immer.“",
    ],
    requires: ["a3_alchemist"],
    trigger: (s) => completedResearchCount(s) >= 1,
    effects: [],
  },
  {
    id: "a3_voice",
    act: 3,
    title: "Eine Stimme im Käfig",
    text: [
      "Der erste Seelenkäfig ist kaum geschlossen, da beginnt das Licht darin zu sprechen.",
      "„Du hast meine Komturei genommen“, sagt es mit der Stimme eines alten Mannes. „Aber du hast mich nicht getötet. Niemand tötet mich. Ich bin nur hinabgestiegen – so wie du jetzt.“",
      "Der Graue Meister. Er ist hier. Unter deiner Burg.",
    ],
    requires: ["a3_first_souls"],
    trigger: (s) => s.buildings.soul_cage >= 1,
    effects: [],
  },
  {
    id: "a3_glass",
    act: 3,
    title: "Durch das Seelenglas",
    text: [
      "Im Seelenglas sind die Toten klar zu erkennen. Bauern. Soldaten. Ein Mann mit dem Siegelring deines Onkels.",
      "Er sieht dich an und hebt die Hand, als wolle er dich warnen. Dann zeigt er nach oben. Auf die Kapelle. Auf den Bischofsstuhl.",
    ],
    requires: ["a3_first_work"],
    trigger: (s) => s.alchemy.completed.soul_glass,
    effects: [],
  },
  {
    id: "a3_stone",
    act: 3,
    title: "Der Stein der Weisen",
    text: [
      "Der Stein ist kleiner als eine Faust und schwerer als ein Amboss. Wer ihn hält, sieht die Wahrheit.",
      "Du siehst den Bischof von Vhal, wie er vor vierzig Jahren in die Krypta hinabstieg und nie wieder alterte. Du siehst ihn den Grauen Orden gründen, um Tote zu ernten. Du siehst ihn am Bett deines Onkels, mit einem Kissen in der Hand.",
      "Der Graue Meister und der Bischof sind ein und derselbe. Und morgen ist Sonntag. Er wird die Messe in deiner Kapelle lesen.",
    ],
    requires: ["a3_glass", "a3_voice"],
    trigger: (s) => s.alchemy.completed.philosophers_stone,
    effects: [{ kind: "setFlag", flag: "act3Complete" }],
  },
];
