import type { BuildingId, UpgradeEffect } from "./balance";
import type { Bi, RetainerId } from "./extensions";
import type { ResourceId } from "./ids";

// ── Jahreszeiten ─────────────────────────────────────────────────────────────

export const SEASON_IDS = ["spring", "summer", "autumn", "winter"] as const;
export type SeasonId = (typeof SEASON_IDS)[number];
/** Eine Jahreszeit dauert 15 Minuten Spielzeit; ein Jahr also eine Stunde. */
export const SEASON_SECONDS = 15 * 60;

export interface SeasonDef {
  readonly name: Bi;
  readonly effects: readonly UpgradeEffect[];
  readonly summary: Bi;
}

/** Über ein Jahr gemittelt bleiben die Faktoren nahe 1 – das Pacing bleibt erhalten. */
export const SEASONS: Readonly<Record<SeasonId, SeasonDef>> = {
  spring: {
    name: { de: "Frühling", en: "Spring" },
    effects: [{ kind: "resourceMult", resource: "gold", factor: 1.1 }, { kind: "resourceMult", resource: "souls", factor: 0.9 }],
    summary: { de: "Gold ×1,1 · Seelen ×0,9", en: "Gold ×1.1 · Souls ×0.9" },
  },
  summer: {
    name: { de: "Sommer", en: "Summer" },
    effects: [{ kind: "resourceMult", resource: "gold", factor: 1.15 }, { kind: "resourceMult", resource: "faith", factor: 0.85 }],
    summary: { de: "Gold ×1,15 · Glauben ×0,85", en: "Gold ×1.15 · Faith ×0.85" },
  },
  autumn: {
    name: { de: "Herbst", en: "Autumn" },
    effects: [{ kind: "resourceMult", resource: "souls", factor: 1.15 }],
    summary: { de: "Seelen ×1,15", en: "Souls ×1.15" },
  },
  winter: {
    name: { de: "Winter", en: "Winter" },
    effects: [{ kind: "resourceMult", resource: "gold", factor: 0.8 }, { kind: "resourceMult", resource: "faith", factor: 1.3 }],
    summary: { de: "Gold ×0,8 · Glauben ×1,3", en: "Gold ×0.8 · Faith ×1.3" },
  },
};

// ── Der Rabe ─────────────────────────────────────────────────────────────────

/** Alle zehn Minuten bringt der Rabe etwas Glänzendes. */
export const RAVEN_GIFT_SECONDS = 10 * 60;
/** Wert des Geschenks: so viel Gold, wie Vhal in zwei Minuten verdient (mindestens 50). */
export const RAVEN_GIFT_GOLD_SECONDS = 120;
export const RAVEN_GIFT_MIN = 50;

export const RAVEN_LINES: readonly Bi[] = [
  { de: "Krah! Ich bin nicht dein Haustier. Ich bin dein Berater.", en: "Caw! I am not your pet. I am your adviser." },
  { de: "Die Leibeigenen reden über dich. Meistens Gutes. Manchmal Reime.", en: "The serfs talk about you. Mostly good things. Sometimes rhymes." },
  { de: "Ich habe den Bischof gesehen. Er hat mich nicht gesehen. So soll es bleiben.", en: "I saw the bishop. He did not see me. Let's keep it that way." },
  { de: "Gold glänzt. Ich mag Gold. Wir verstehen uns.", en: "Gold shines. I like gold. We understand each other." },
  { de: "Brannoc hat mir einen Wurm gegeben. Ich vertraue ihm jetzt vollkommen.", en: "Brannoc gave me a worm. I now trust him completely." },
  { de: "Krah. Das heißt „mehr Steuern“. Glaub mir.", en: "Caw. That means “more taxes”. Trust me." },
  { de: "In der Krypta flüstert es. Ich flüstere zurück. Wir sind jetzt Freunde.", en: "Something whispers in the crypt. I whisper back. We are friends now." },
  { de: "Wenn du mich noch einmal anstupst, schreibe ich es in die Chronik.", en: "Poke me once more and I'll write it into the chronicle." },
];
export const RAVEN_GIFT_LINE: Bi = { de: "Krah! Sieh nur, was ich gefunden habe!", en: "Caw! Look what I found!" };
export const RAVEN_WAIT_LINE: Bi = { de: "Mein nächster Schatz braucht noch etwas Zeit.", en: "My next treasure needs a little more time." };

// ── Der wandernde Händler ────────────────────────────────────────────────────

export const OFFER_KINDS = ["iron", "swords", "soldiers", "faith", "souls", "fortune"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

export interface OfferDef {
  readonly name: Bi;
  /** Ressource, die man bekommt (null = Söldner oder Glückssegen). */
  readonly resource: ResourceId | null;
  /** Gelieferte Menge in Sekunden Produktion dieser Ressource (mindestens `min`). */
  readonly seconds: number;
  readonly min: number;
  /** Preis in Sekunden Goldproduktion. */
  readonly priceSeconds: number;
}

export const OFFERS: Readonly<Record<OfferKind, OfferDef>> = {
  iron: { name: { de: "Nordisches Eisen", en: "Northern iron" }, resource: "iron", seconds: 600, min: 200, priceSeconds: 180 },
  swords: { name: { de: "Klingen aus Toledo", en: "Blades from Toledo" }, resource: "swords", seconds: 0, min: 10, priceSeconds: 150 },
  soldiers: { name: { de: "Söldner mit eigenem Schwert", en: "Mercenaries with their own swords" }, resource: null, seconds: 0, min: 8, priceSeconds: 240 },
  faith: { name: { de: "Eine echte Reliquie (fast)", en: "A genuine relic (almost)" }, resource: "faith", seconds: 900, min: 500, priceSeconds: 200 },
  souls: { name: { de: "Ein Glas voll Seelen", en: "A jar full of souls" }, resource: "souls", seconds: 900, min: 50, priceSeconds: 200 },
  fortune: { name: { de: "Glücksamulett (Gold ×2 für 5 min)", en: "Lucky charm (gold ×2 for 5 min)" }, resource: null, seconds: 300, min: 0, priceSeconds: 240 },
};

export const MERCHANT_FIRST_SECONDS = 5 * 60;
export const MERCHANT_INTERVAL = 8 * 60;
export const MERCHANT_STAY = 3 * 60;
export const MERCHANT_OFFERS = 3;
export const MERCHANT_MIN_PRICE = 100;
/** Feilschen: 50 % Rabatt um 30 %, 25 % bleibt er hart, 25 % ist er beleidigt und zieht das Angebot zurück. */
export const HAGGLE_DISCOUNT = 0.7;
export const HAGGLE_WIN = 0.5;
export const HAGGLE_FIRM = 0.75;

// ── Burgplan ─────────────────────────────────────────────────────────────────

export const PLAN_COLUMNS = 5;
export const PLAN_ROWS = 4;
export const PLAN_SIZE = PLAN_COLUMNS * PLAN_ROWS;
/** Jeder passende Nachbar (waagrecht oder senkrecht) hebt beide Gebäude um 10 %. */
export const PLAN_NEIGHBOUR_BONUS = 0.1;

/** Gute Nachbarschaften; die Beziehung gilt in beide Richtungen. */
export const PLAN_AFFINITIES: readonly (readonly [BuildingId, BuildingId])[] = [
  ["serf", "mill"],
  ["serf", "granary"],
  ["woodcutter", "mill"],
  ["woodcutter", "mine"],
  ["mill", "granary"],
  ["market", "tollhouse"],
  ["market", "mint"],
  ["market", "offering_box"],
  ["tollhouse", "bank"],
  ["mint", "bank"],
  ["mine", "mint"],
  ["offering_box", "reliquary"],
  ["reliquary", "bell_tower"],
  ["bell_tower", "candle"],
  ["candle", "ossuary"],
  ["ossuary", "soul_cage"],
];

// ── Gefolgsleute: Treue und Aufträge ─────────────────────────────────────────

export const LOYALTY_START = 50;
export const LOYALTY_MAX = 100;
/** Bevorzugen (befördern, ausrüsten, in ein Amt setzen) hebt die eigene Treue und senkt die des Rivalen. */
export const LOYALTY_FAVOR = 8;
export const LOYALTY_QUEST = 30;

/** Wer wen nicht leiden kann (beidseitig). */
export const RIVALS: Readonly<Record<RetainerId, RetainerId>> = {
  gunther: "wendel",
  wendel: "gunther",
  hedda: "ruprecht",
  ruprecht: "hedda",
  mechthild: "anselm",
  anselm: "mechthild",
};

export interface QuestStep {
  readonly title: Bi;
  /** Was die Person von dir will. */
  readonly ask: Bi;
  /** Die kleine Geschichte, wenn der Auftrag erfüllt ist. */
  readonly story: readonly Bi[];
  readonly cost: { readonly resource: ResourceId; readonly amount: number };
  readonly seconds: number;
}

export const QUESTS: Readonly<Record<RetainerId, readonly QuestStep[]>> = {
  gunther: [
    {
      title: { de: "Gunthers Pfennige", en: "Gunther's Pennies" },
      ask: { de: "Gunther will die Steuerbücher prüfen. Er braucht dafür Gold „zum Vergleichen“.", en: "Gunther wants to audit the tax ledgers. He needs gold “for comparison”." },
      story: [
        { de: "Gunther kehrt nach drei Tagen aus dem Kontor zurück, staubig und strahlend. Er hat einen Fehler gefunden: Vhal schuldet sich selbst seit Jahren elf Pfennige.", en: "Gunther returns from the counting house after three days, dusty and beaming. He found an error: Vhal has owed itself eleven pennies for years." },
        { de: "Er zahlt sie feierlich zurück, von der linken in die rechte Truhe. Du hast nicht das Herz, ihn aufzuhalten.", en: "He solemnly pays them back, from the left chest into the right. You haven't the heart to stop him." },
      ],
      cost: { resource: "gold", amount: 2_000 },
      seconds: 180,
    },
    {
      title: { de: "Das große Zählen", en: "The Great Count" },
      ask: { de: "Gunther will jede Münze in Vhal einmal in der Hand gehalten haben. Er schätzt, es dauert nur ein Weilchen.", en: "Gunther wants to have held every coin in Vhal once. He estimates it will take only a little while." },
      story: [
        { de: "Es hat kein Weilchen gedauert, sondern eine Woche. Gunther schläft jetzt mit einer Rechentafel unter dem Kopfkissen.", en: "It took not a little while but a week. Gunther now sleeps with an abacus under his pillow." },
        { de: "Seitdem verschwindet in Vhal kein Pfennig mehr. Die Diebe haben sich bei dir beschwert.", en: "Since then not a single penny has vanished in Vhal. The thieves have complained to you." },
      ],
      cost: { resource: "gold", amount: 250_000 },
      seconds: 420,
    },
  ],
  hedda: [
    {
      title: { de: "Heddas Nase", en: "Hedda's Nose" },
      ask: { de: "Hedda riecht eine neue Erzader unter dem Brunnen. Sie braucht Eisen für Hacken.", en: "Hedda smells a new ore vein under the well. She needs iron for picks." },
      story: [
        { de: "Hedda gräbt drei Tage lang und findet: einen sehr alten Stiefel. Darin steckt allerdings ein Klumpen Erz so groß wie ein Hühnerei.", en: "Hedda digs for three days and finds: a very old boot. Inside it, however, is a lump of ore the size of a hen's egg." },
        { de: "„Ich hab’s doch gesagt“, sagt sie. Gesagt hat sie es nicht, aber niemand widerspricht einer Frau mit Hacke.", en: "“Told you so,” she says. She hadn't, but nobody argues with a woman holding a pick." },
      ],
      cost: { resource: "iron", amount: 300 },
      seconds: 180,
    },
    {
      title: { de: "Die Tiefe Grube", en: "The Deep Pit" },
      ask: { de: "Hedda will tiefer graben als je ein Mensch zuvor. Angeblich hört sie unten jemanden klopfen.", en: "Hedda wants to dig deeper than anyone before. She claims she hears someone knocking down there." },
      story: [
        { de: "Unten klopft tatsächlich jemand: ein Zwerg? Ein Toter? Hedda klopft zurück. Seitdem bringt die Grube doppelt so viel Erz.", en: "Someone is indeed knocking down there: a dwarf? A dead man? Hedda knocks back. Since then the pit yields twice as much ore." },
        { de: "Fragen stellt niemand. In Vhal ist das eine Tugend.", en: "Nobody asks questions. In Vhal that counts as a virtue." },
      ],
      cost: { resource: "iron", amount: 20_000 },
      seconds: 420,
    },
  ],
  ruprecht: [
    {
      title: { de: "Ruprechts Klingenprobe", en: "Ruprecht's Blade Trial" },
      ask: { de: "Ruprecht will jede Klinge der Waffenkammer persönlich prüfen. An einem Kürbis.", en: "Ruprecht wants to test every blade in the armoury personally. On a pumpkin." },
      story: [
        { de: "Es waren viele Kürbisse. Die Bauern feiern seither ein Kürbisfest, ohne zu wissen, warum.", en: "There were many pumpkins. The peasants have celebrated a pumpkin festival ever since, without knowing why." },
        { de: "Ruprecht ist zufrieden. Drei Klingen hat er aussortiert. Die anderen nennt er jetzt beim Vornamen.", en: "Ruprecht is satisfied. He rejected three blades. He now calls the others by their first names." },
      ],
      cost: { resource: "swords", amount: 20 },
      seconds: 240,
    },
    {
      title: { de: "Das Turnier von Vhal", en: "The Tournament of Vhal" },
      ask: { de: "Ruprecht will ein Turnier ausrichten. Er braucht Gold für Fahnen, Lanzen und einen Gegner, der verliert.", en: "Ruprecht wants to hold a tournament. He needs gold for banners, lances and an opponent who loses." },
      story: [
        { de: "Der Gegner hat leider gewonnen. Ruprecht nennt es eine „taktische Niederlage“ und hat die Ehre trotzdem für sich beansprucht.", en: "Sadly the opponent won. Ruprecht calls it a “tactical defeat” and has claimed the glory anyway." },
        { de: "Das Volk hat drei Tage gelacht. Lachende Bauern zahlen lieber Steuern.", en: "The folk laughed for three days. Laughing peasants pay taxes more gladly." },
      ],
      cost: { resource: "gold", amount: 2_000_000 },
      seconds: 480,
    },
  ],
  mechthild: [
    {
      title: { de: "Mechthilds Gespräche", en: "Mechthild's Conversations" },
      ask: { de: "Mutter Mechthild will mit den Toten der Krypta reden. Sie braucht Seelen als „Gesprächsgrundlage“.", en: "Mother Mechthild wants to speak with the dead in the crypt. She needs souls as “common ground”." },
      story: [
        { de: "Die Toten haben viel zu erzählen, vor allem über ihre Nachbarn. Mechthild schreibt alles auf.", en: "The dead have much to say, mostly about their neighbours. Mechthild writes everything down." },
        { de: "Einer verrät, wo er sein Erspartes vergraben hat. Er besteht darauf, dass du es bekommst. Er braucht es ja nicht mehr.", en: "One reveals where he buried his savings. He insists you have it. He doesn't need it any more." },
      ],
      cost: { resource: "souls", amount: 500 },
      seconds: 240,
    },
    {
      title: { de: "Die Totenwache", en: "The Death Watch" },
      ask: { de: "Mechthild will eine Nacht lang in der Krypta wachen. Allein. Sie nimmt nur eine Kerze und sehr viele Seelen mit.", en: "Mechthild wants to keep watch in the crypt for a night. Alone. She takes only a candle and a great many souls." },
      story: [
        { de: "Am Morgen kommt sie heraus, die Haare schneeweiß. Vorher waren sie grau, also ist es halb so schlimm.", en: "In the morning she comes out with snow-white hair. It was grey before, so it's only half as bad." },
        { de: "Die Toten der Krypta gehorchen ihr jetzt aufs Wort. Sie sagen „bitte“. Das hat noch nie jemand erlebt.", en: "The dead of the crypt now obey her every word. They say “please”. Nobody has ever seen that before." },
      ],
      cost: { resource: "souls", amount: 50_000 },
      seconds: 480,
    },
  ],
  anselm: [
    {
      title: { de: "Anselms Predigt", en: "Anselm's Sermon" },
      ask: { de: "Bruder Anselm will eine Predigt halten, die er im Schlaf geschrieben hat. Er braucht Glauben als Publikum.", en: "Brother Anselm wants to give a sermon he wrote in his sleep. He needs faith as an audience." },
      story: [
        { de: "Die Predigt dauert vier Stunden und handelt hauptsächlich von Käse. Trotzdem weinen alle.", en: "The sermon lasts four hours and is mainly about cheese. Everyone weeps anyway." },
        { de: "Anselm sagt, das sei die Gnade. Der Käsehändler sagt, das sei Werbung.", en: "Anselm says that is grace. The cheesemonger says it is advertising." },
      ],
      cost: { resource: "faith", amount: 5_000 },
      seconds: 240,
    },
    {
      title: { de: "Die wache Nacht", en: "The Waking Night" },
      ask: { de: "Anselm will eine ganze Nacht wach bleiben und beten. Er hat es noch nie geschafft. Er braucht viel Glauben – an sich selbst.", en: "Anselm wants to stay awake all night and pray. He has never managed it. He needs much faith – in himself." },
      story: [
        { de: "Er schläft nach elf Minuten ein. Aber im Schlaf betet er weiter, lauter und schöner als je zuvor.", en: "He falls asleep after eleven minutes. But in his sleep he keeps praying, louder and more beautifully than ever." },
        { de: "Die Pilger kommen jetzt nachts. Tagsüber schlafen sie. Anselm findet, das sei der rechte Weg.", en: "The pilgrims now come at night. During the day they sleep. Anselm thinks that is the right way." },
      ],
      cost: { resource: "faith", amount: 400_000 },
      seconds: 480,
    },
  ],
  wendel: [
    {
      title: { de: "Wendels Wanderung", en: "Wendel's Wander" },
      ask: { de: "Wendel will „mal eben“ nach Grauweiler und zurück. Er braucht Proviant, also Gold.", en: "Wendel wants to pop over to Grauweiler and back. He needs provisions, meaning gold." },
      story: [
        { de: "Wendel war nicht in Grauweiler. Er war in Venedig, Prag und an einem Ort, den er nicht nennen will.", en: "Wendel did not go to Grauweiler. He went to Venice, Prague and somewhere he refuses to name." },
        { de: "Er bringt eine Gewürzmischung, drei Freundschaften und einen Handelsvertrag mit. Der Vertrag ist auf Latein. Wendel kann kein Latein.", en: "He brings back a spice blend, three friendships and a trade agreement. The agreement is in Latin. Wendel cannot read Latin." },
      ],
      cost: { resource: "gold", amount: 50_000_000 },
      seconds: 300,
    },
    {
      title: { de: "Alles ein bisschen", en: "A Little of Everything" },
      ask: { de: "Wendel will einen Monat lang in jedem Amt aushelfen. Er braucht Gold, Eisen und Geduld – deine.", en: "Wendel wants to help out in every office for a month. He needs gold, iron and patience – yours." },
      story: [
        { de: "Wendel hat den Vogt beraten, den Bergmeister vertreten und dem Kaplan das Singen beigebracht. Schlecht, aber laut.", en: "Wendel advised the bailiff, stood in for the mine master and taught the chaplain to sing. Badly, but loudly." },
        { de: "Alle Ämter laufen jetzt ein wenig besser, und niemand weiß genau, warum.", en: "All offices now run a little better, and nobody knows exactly why." },
      ],
      cost: { resource: "gold", amount: 5e9 },
      seconds: 600,
    },
  ],
};
