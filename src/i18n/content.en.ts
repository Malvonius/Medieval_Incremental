/** Englische Spieltexte, nach ID. Fehlende Einträge fallen automatisch auf Deutsch zurück. */
type Named = { readonly name: string; readonly description: string };
type Story = { readonly title: string; readonly text: readonly string[] };

export const STORY_EN: Readonly<Record<string, Story>> = {
  a1_inheritance: { title: "The Inheritance", text: ["The letter bears your uncle's seal – broken, as if someone had read it before you.", "“Vhal is yours now,” it says. Nothing more. No greeting, no warning.", "When you reach the castle you find charred beams, a dry well and a dozen peasants staring at you like a ghost. The plague took everything from them. Except their tax debts."] },
  a1_first_serfs: { title: "Hands in the Mud", text: ["Ten serfs now work your fields. They work in silence.", "At night you hear them whisper. About your uncle. About the fire. About what remained in the chapel."] },
  a1_smith: { title: "The Masterless Smith", text: ["A giant with burnt arms knocks at the gate. He calls himself Brannoc and says he served your uncle.", "“The forge still stands,” he says. “Give me iron and I'll give you blades. You will need them, my lord. Soon.”"] },
  a1_first_blade: { title: "First Steel", text: ["The first blade is notched and heavy. Brannoc weighs it in his hand and nods.", "The peasants pay more punctually since armed men stand at the gate. Fear is a reliable currency."] },
  a1_ledger: { title: "The Ledger", text: ["In the cellar vault you find your uncle's ledger. The last pages have been torn out.", "On the second to last there is only a name, underlined three times: “The Grey Order”."] },
  a1_armory: { title: "An Armory", text: ["Fifty swords now hang on the wall. Enough for a small guard – too few for a war.", "Brannoc keeps sharpening in silence. Once you ask him what he fears. He only looks east."] },
  a1_grey_banner: { title: "The Grey Banner", text: ["Riders appear on the horizon in the morning mist. Their banners are grey as ash, their armour bears no crest.", "A herald rides up to the moat. “The Order demands what it is owed,” he calls. “You have until the new moon.”", "Behind you, you hear Brannoc stoke the forge anew."] },
  a2_council: { title: "The War Council", text: ["The night after the ultimatum a woman comes through the north gate. Her cloak is wet from the river, her blade dry.", "“I am Sera of Dornach,” she says. “The Order burned my castle, as it burned your uncle's. Give me men and I'll show you where it bleeds.”", "You clear the old map table. The dust on it lies thick as snow."] },
  a2_first_blood: { title: "First Blood", text: ["Sera returns with prisoners, hands bound with willow rods. Among the bandits one carries a grey cloth in his boot.", "“The Order pays them,” says Sera. “They are to bleed your land dry before it takes it.”", "The stairs to the dungeon have not been used since the fire. Now footsteps echo there again."] },
  a2_confession: { title: "A Confession", text: ["The man with the grey cloth holds out for three days. On the fourth he draws a tower in the dust with a bloody finger.", "“The outpost,” he whispers. “That's where they pay us. That's where the seals are.”"] },
  a2_seal: { title: "The Seal", text: ["In the outpost you find a chest full of wax seals. Grey, without a crest – except for one.", "It shows a crozier crossed with a key. The sign of the Bishop of Vhal.", "You pocket it and tell no one. Not even Sera."] },
  a2_traitor: { title: "The Traitor", text: ["The prisoners all tell the same story: the Order always knew when your guards changed.", "Brannoc finds the answer. Your uncle's old chamberlain sent pigeons to Grauweiler every week.", "He confesses before anyone asks. “The commandery,” he says. “The Grey Master commands there. But you won't kill him. No one kills him.”"] },
  a2_komturei: { title: "The Commandery Falls", text: ["Grauweiler burns all night. In the morning Sera stands before the Grey Master's throne – and the throne is empty.", "Beneath the commandery a staircase leads down into the depths. Cold air rises from below, and with it a whisper that knows your name.", "“He didn't flee,” Sera says quietly. “He descended.” Her gaze drifts west. To Vhal. To the bolted door beneath your own chapel."] },
  a3_descent: { title: "The Door Beneath the Chapel", text: ["The bolt is drawn from the inside. Brannoc needs a night and three chisels to break it.", "Beyond, a spiral staircase leads down, deeper than the castle is tall. The walls are lined with bones, skull upon skull, and at the very bottom lie the new ones: your fallen from the war against the Order.", "No one brought them here. They were simply there."] },
  a3_first_souls: { title: "What Remains", text: ["The crypt is never quite dark. Between the bones glows a pale light that moves when you aren't looking.", "Sera refuses to go down. “Those are souls,” she says. “And someone has learned to keep them.”"] },
  a3_alchemist: { title: "Magistra Ilse Varn", text: ["The alchemist's tower stood empty since your uncle died. Now there is light inside.", "The woman waiting at the top has green fingertips and no eyebrows. “I worked for your uncle,” she says. “He wanted to know what the Order does with the dead. He found out.”", "She points to a cauldron with no fire beneath it that boils nonetheless. “Bring me souls. Then I'll show you how he died.”"] },
  a3_first_work: { title: "The First Work", text: ["Ilse Varn works for three days without sleep. When she opens the flask the tower smells of iron and rain.", "“Alchemy is no magic,” she says. “It is a calculation. And someone always pays.”"] },
  a3_voice: { title: "A Voice in the Cage", text: ["The first soul cage is barely shut when the light inside begins to speak.", "“You took my commandery,” it says in an old man's voice. “But you did not kill me. No one kills me. I merely descended – as you do now.”", "The Grey Master. He is here. Beneath your castle."] },
  a3_glass: { title: "Through the Soul Glass", text: ["In the soul glass the dead are clearly visible. Peasants. Soldiers. A man wearing your uncle's signet ring.", "He looks at you and raises a hand as if to warn you. Then he points upwards. At the chapel. At the bishop's chair."] },
  a3_stone: { title: "The Philosopher's Stone", text: ["The stone is smaller than a fist and heavier than an anvil. Whoever holds it sees the truth.", "You see the Bishop of Vhal descending into the crypt forty years ago and never ageing again. You see him found the Grey Order to harvest the dead. You see him at your uncle's bedside, a pillow in his hands.", "The Grey Master and the bishop are one and the same. And tomorrow is Sunday. He will say mass in your chapel."] },
  a4_mass: { title: "Sunday Mass", text: ["The bishop says mass as if nothing had happened. His voice is warm, his hands are steady, and the congregation hangs on his every word.", "“Whoever strikes off his head will hang as the murderer of a saint,” Sera whispers. “You must open their eyes first.”", "After mass the chapel stands empty. Empty – and for the first time in forty years without him."] },
  a4_first_faith: { title: "An Altar of Your Own", text: ["The first peasants come hesitantly. They drop copper coins into the offering box and glance around as if the bishop could hear them.", "Faith is a strange currency. It cannot be stolen. But it can be bought."] },
  a4_vow: { title: "The First Vow", text: ["You kneel before the altar and speak the words Ilse Varn wrote down for you. The candles flicker though there is no wind.", "Something listened. Whether it was God, you do not know."] },
  a4_sermon: { title: "The Sermon", text: ["On the third Sunday you climb the pulpit yourself. In your hand you hold the seal with the crozier you found in the outpost.", "You tell them everything: the crypt, the Grey Order, the pillow at your uncle's bedside. No one speaks. Then an old woman stands up and spits on the bishop's chair.", "The congregation is yours. The bishop has vanished."] },
  a4_betrayal: { title: "The Betrayal", text: ["In the night the alchemist's tower is empty. Ilse Varn is gone, and with her the Philosopher's Stone.", "On her table lies a letter in a hand you know – the bishop's. “Good pupil,” it reads. “The stone belongs to the one who made it.”", "Beneath it, in her own hand, a single sentence: “He is in every stone of Vhal. Burn everything, or he will never die.”"] },
  a4_ashes: { title: "Vhal Burns", text: ["The flames rise higher than the keep. The mill, the market, the forge – everything burns. From the walls comes a scream that is not from a human throat.", "In the morning you stand in the ashes. They are warm and grey and crackle under your boots as if alive.", "Brannoc picks up a handful and lets it run through his fingers. “On this,” he says, “one builds better than on stone.”"] },
  a4_rebirth: { title: "From the Ashes", text: ["Vhal stands again. The new walls are darker than the old, and ash glints in their mortar.", "But bad news comes from the hills in the east. The dead of Grauweiler have risen from their graves – and they march under a banner with crozier and key.", "The bishop has the stone. And he has an army."] },
  a5_siege: { title: "The Army of the Dead", text: ["They come by night. No drumbeat, no horn – only the crunch of bone on frozen ground.", "Sera stands on the battlements counting the torches. Then she stops. “They aren't torches,” she says. “They are their eyes.”", "The war council sits until morning. Vhal must hold – wave after wave, until the bishop himself stands at the gate."] },
  a5_first_wave: { title: "The First Night", text: ["The vanguard shatters on the palisades like glass. From the wreckage lights rise and drift down into the crypt.", "Your fallen fight on – on the other side. The souls of the enemy are yours now."] },
  a5_brannoc: { title: "Brannoc's Last Blade", text: ["When the faceless knights break through the gate, Brannoc stands alone in the archway. He has left the forge for the first time in years.", "He holds them long enough. Afterwards you find him among the armour, hammer still in hand.", "In the crypt a new light burns that night. It is brighter than the others."] },
  a5_ilse: { title: "The Pupil Returns", text: ["The morning after the plague riders a veiled figure stands at the north gate. Ilse Varn. Her green fingers have turned black.", "“He lied to me,” she says. “The stone doesn't make him immortal. It binds him. Whoever holds the stone when he falls gets everything – his power, his dead, his hunger.”", "“Or one smashes it,” says Sera. Ilse nods slowly. “With the last bell. If enough people believe it will help.”"] },
  a5_bishop: { title: "The Shepherd at the Gate", text: ["When the risen Order falls, all goes quiet. Then the army of the dead parts, and through the gap rides an old man in white vestments.", "He raises his crozier, and at its tip glows the Philosopher's Stone. “My son,” he calls, “open the gate. I loved your uncle. I will love you too.”", "Behind you the faithful of Vhal ring the bells. All but one."] },
  a5_fall: { title: "The Fall of the Bishop", text: ["He does not die like a man. He crumbles, layer by layer, until only vestments, dust and a glowing stone lie in the snow.", "The dead before the walls stand still. They wait. For him – or for whoever picks up the stone.", "Sera looks at you. Ilse looks at the stone. In the bell tower hangs the last bell, and no one has rung it yet."] },
  a5_end_light: { title: "Ending: The Light of Vhal", text: ["The last bell sounds different from the others. Deeper. When it strikes for the third time the stone in your hand splits in two.", "Outside the dead fall. Not like warriors, but like sleepers who may finally go. From the crypt a thousand lights rise – one of them brighter than the rest.", "Vhal is poor, burnt and free. In spring the peasants plough fields where no one whispers any more.", "— The End —"] },
  a5_end_ash: { title: "Ending: The Ashes of Vhal", text: ["The stone is warm in your hand. It throbs like a second heart, and before the walls ten thousand dead bow their heads.", "Sera leaves that same night. Ilse stays. She calls you “master” now, and you do not correct her.", "Vhal grows mighty, richer than ever before and never bright again. And deep beneath the chapel a new light begins to whisper. It knows your name.", "— The End —"] },
  a1_memory: { title: "Here Before", text: ["You know this letter. You know the broken seal, the dry well, the peasants' stares.", "In your hand lies a little heap of ash you did not bring. It is warm.", "Vhal remembers you. This time you will be faster."] },
  a5_epilogue_light: { title: "Epilogue: Spring", text: ["A year later poppies bloom in the fields before the castle. No one ploughs them under.", "Sometimes, when the bell rings for vespers, you think you hear a hammer striking an anvil somewhere.", "Yet in the ashes beneath the chapel something still glows. Perhaps it all begins again. (New Game+ in the Ritual of Ash.)"] },
  a5_epilogue_ash: { title: "Epilogue: The Grey Master", text: ["The years pass and you do not age. Every evening Ilse brings you the count of the dead. It never grows smaller.", "One night a young heir knocks at your gate, a letter with a broken seal in hand.", "You smile. And it all begins again. (New Game+ in the Ritual of Ash.)"] },
};

export const BUILDINGS_EN: Readonly<Record<string, Named>> = {
  serf: { name: "Serf", description: "Ploughs the burnt field. Doesn't complain. Not yet." },
  woodcutter: { name: "Woodcutter", description: "Fells timber in the Black Forest for as long as the light lasts." },
  mill: { name: "Mill", description: "Its wheel creaks all night. No one asks what it grinds." },
  market: { name: "Market Stall", description: "Salt, tallow and rumours – everything has its price." },
  tollhouse: { name: "Toll House", description: "Whoever crosses the bridge of Vhal pays. Whoever doesn't, swims." },
  granary: { name: "Granary", description: "Who has the grain has the hungry. Who has the hungry has the land." },
  mint: { name: "Mint", description: "Silver with your face on it – and a little less silver than it says." },
  bank: { name: "Bank House", description: "Lombards lend you gold at interest. No one lends gold against the dead – yet." },
  offering_box: { name: "Offering Box", description: "The congregation gives what it doesn't have. For a god who doesn't listen." },
  reliquary: { name: "Reliquary", description: "A finger bone of Saint Adelheid. The third one you've bought this year." },
  bell_tower: { name: "Bell Tower", description: "The bell is silent no more. It can be heard as far as Grauweiler." },
  candle: { name: "Death Light", description: "A candle of tallow and ash. The souls crowd around its flame." },
  ossuary: { name: "Ossuary", description: "Skulls, neatly stacked. Each still bears a name no one remembers." },
  soul_cage: { name: "Soul Cage", description: "A cage of bone and cold iron. What flickers inside wants out." },
  mine: { name: "Ore Mine", description: "Deep in the mountain prisoners dig for iron." },
};

export const UPGRADES_EN: Readonly<Record<string, Named>> = {
  stern_reeve: { name: "Stern Reeve", description: "Collecting taxes yields three times as much." },
  iron_sickles: { name: "Iron Sickles", description: "Serfs produce twice as much." },
  heavy_axes: { name: "Heavy Axes", description: "Woodcutters produce twice as much." },
  tithe_ledger: { name: "Tithe Ledger", description: "A book full of debts. Collecting taxes yields five times as much." },
  waterwheel: { name: "Black Oak Waterwheel", description: "Mills produce twice as much." },
  serf_levy: { name: "Corvée", description: "Serfs work Sundays too. Triple production." },
  guild_charter: { name: "Guild Charter", description: "Market stalls produce twice as much." },
  bellows: { name: "Oxhide Bellows", description: "The forge works twice as fast." },
  rich_vein: { name: "Rich Vein", description: "Ore mines yield twice as much iron." },
  quench_oil: { name: "Quenching Oil", description: "The forge works twice as fast again." },
  granary_vaults: { name: "Vaults Beneath the Granary", description: "Granaries produce twice as much." },
  debased_coin: { name: "Debased Coin", description: "Mints produce twice as much." },
  journeymen: { name: "Journeymen for Brannoc", description: "The forge works twice as fast." },
  second_hearth: { name: "Second Hearth", description: "The forge queue holds 5 more orders." },
  war_map: { name: "War Map of Vhal", description: "Expeditions take a third less time." },
  field_surgeon: { name: "Field Surgeon", description: "Halves losses on expeditions." },
  second_captain: { name: "Second Captain", description: "One more expedition can be underway at once." },
  thumbscrews: { name: "Thumbscrews", description: "Each interrogation yields one more clue." },
  blackiron_chains: { name: "Black Iron Chains", description: "Forced labourers give twice the bonus." },
  pact_hunger: { name: "Pact of Hunger", description: "The dead want to be fed. In return they fill your coffers: gold ×2." },
  pact_iron: { name: "Pact of Iron", description: "The mines will no longer collapse. No one asks who holds them up: iron ×2." },
  pact_lament: { name: "Pact of Lament", description: "Who laments, stays. Souls ×2." },
  pact_harvest: { name: "Pact of the Harvest", description: "Every ear of grain in your fields is rooted in a grave: gold ×3." },
  pact_silence: { name: "Pact of Silence", description: "They whisper no more. They obey. Souls ×2." },
  bank_charter: { name: "Bill of Exchange", description: "Bank houses produce twice as much." },
  incense: { name: "Incense from Grauweiler", description: "Offering boxes yield twice as much faith." },
  holy_bones: { name: "Holy Bones", description: "Reliquaries yield twice as much faith." },
  second_altar: { name: "Second Altar", description: "You can take one more vow." },
  blessed_arrows: { name: "Blessed Arrows", description: "Dipped in holy water. The dead fear them. Defense ×2." },
  boiling_pitch: { name: "Boiling Pitch", description: "Boiling pitch above the gate. The dead burn too. Defense ×2." },
  bone_wards: { name: "Bone Wards", description: "Ilse Varn's last formula, written into the walls with souls. Defense ×3." },
  steward: { name: "Steward", description: "A pedantic man with an abacus. Buys gold buildings by himself (can be switched off)." },
  third_altar: { name: "Third Altar", description: "One more vow – and with it new bonds between them." },
};

export const RESEARCH_EN: Readonly<Record<string, Named>> = {
  mercury: { name: "Doctrine of Mercury", description: "Living silver that devours every metal. Gold ×2." },
  distillate: { name: "Distillate of the Dead", description: "What remains when you boil a corpse long enough. Souls ×2." },
  black_iron: { name: "Black Iron", description: "Hardened with mercury, quenched with souls. Iron ×3." },
  homunculus: { name: "Homunculus", description: "A creature of root and blood that closes wounds. Expedition losses halved." },
  soul_glass: { name: "Soul Glass", description: "Glass through which you can see the dead. And they you. Souls ×3." },
  transmutation: { name: "Transmutation", description: "Lead into gold. The price is not lead. Gold ×3." },
  elixir: { name: "Elixir of Life", description: "Your soldiers march without sleep. Expeditions twice as fast." },
  philosophers_stone: { name: "The Philosopher's Stone", description: "The goal of all alchemy. It shows the truth – whether you want it or not. Gold ×2." },
};

export const EXPEDITIONS_EN: Readonly<Record<string, Named>> = {
  bandits: { name: "Bandit Camp in the Black Forest", description: "Rabble robbing peasants. Your rabble." },
  toll_fort: { name: "Toll Fort at the Ford", description: "A mercenary captain levies tolls in the Order's name." },
  outpost: { name: "Outpost of the Grey Order", description: "A watchtower of grey stone. Its flag bears no crest." },
  komturei: { name: "The Commandery of Grauweiler", description: "The heart of the Order in this land. Whoever takes it silences it." },
};

export const FORTIFICATIONS_EN: Readonly<Record<string, Named>> = {
  palisade: { name: "Palisade", description: "Sharpened stakes from the Black Forest. They stop the living – and sometimes the dead." },
  tower: { name: "Watchtower", description: "Stone on ash. From up there you see the army coming." },
  gatehouse: { name: "Gatehouse", description: "Two portcullises, three murder holes and a gate of black iron." },
};

export const WAVES_EN: readonly string[] = [
  "The Vanguard of Bones",
  "The Drowned of the Ford",
  "The Faceless Knights",
  "The Funeral Train of Grauweiler",
  "The Plague Riders",
  "The Fallen of Vhal",
  "The Grey Order, Risen",
  "The Bishop of Vhal",
];

export const VOWS_EN: Readonly<Record<string, { name: string; blessing: string; curse: string }>> = {
  penance: { name: "Vow of Penance", blessing: "Faith ×3", curse: "Iron ×0.25" },
  silence: { name: "Vow of Silence", blessing: "Gold ×3", curse: "Collecting taxes yields nothing" },
  sword: { name: "Vow of the Sword", blessing: "Expeditions three times as fast", curse: "Double losses" },
  poverty: { name: "Vow of Poverty", blessing: "Souls ×4", curse: "Gold ×0.5" },
};

export const RECIPES_EN: Readonly<Record<string, Named>> = {
  sword: { name: "Longsword", description: "Every blade in the armory raises gold production by 2 %." },
};

export const ENDINGS_EN: Readonly<Record<string, Named>> = {
  light: { name: "Ring the Last Bell", description: "Gather the congregation, ring the bell and smash the stone. What it gives, you lose with it." },
  ash: { name: "Take the Stone", description: "Hold it tight. The dead obey you now. Someone has to lead them." },
};

export const EVENTS_EN: Readonly<Record<string, { title: string; text: string; choices: readonly string[] }>> = {
  harvest: { title: "A Good Harvest", text: "For the first time since the plague the ears bend with grain. The peasants dare to smile.", choices: ["Hold a feast (gold ×2 for 5 min)", "Store everything (+5 min of gold production)"] },
  plague: { title: "The Plague Returns", text: "In the huts by the river the children cough blood. The old ones cross themselves.", choices: ["Quarantine (−20 % gold)", "Pray and hope (gold ×0.5 for 5 min)"] },
  merchant: { title: "A Travelling Merchant", text: "He sells iron from the north. He doesn't ask what for. You don't ask where from.", choices: ["Buy (−10 % gold, +10 min of iron)", "Decline"] },
  raid: { title: "Raid by Night", text: "Riders without crests burn down a barn and vanish into the Black Forest.", choices: ["Pursue (−10 % soldiers, +3 prisoners)", "Hold the walls (−15 % gold)"] },
  wisp: { title: "A Light in the Crypt", text: "Among the bones dances a light that does not belong with the others. It wants you to follow.", choices: ["Follow it (+5 min of souls)", "Seal the crypt (souls ×2 for 10 min)"] },
  pilgrims: { title: "Pilgrims at the Gate", text: "They heard of the sermon. They came barefoot from Grauweiler.", choices: ["Take them in (+10 min of faith)", "Turn them away (+2 min of gold production)"] },
};

export const CHALLENGES_EN: Readonly<Record<string, { name: string; description: string; rewardText: string }>> = {
  iron_fist: { name: "Rusty Blades", description: "Iron ×0.1 for the whole run.", rewardText: "Permanently iron ×2" },
  poverty: { name: "Empty Coffers", description: "Gold ×0.5 for the whole run.", rewardText: "Permanently gold ×1.5" },
  silence: { name: "Silent Bells", description: "Collecting taxes yields nothing, faith ×0.5.", rewardText: "Permanently faith ×2" },
};

export const SYNERGIES_EN: readonly Named[] = [
  { name: "The Hungry War", description: "Souls ×2 additionally" },
  { name: "The Silent Sacrifice", description: "Faith ×2 additionally" },
  { name: "The Silent Watch", description: "Defense ×1.5" },
];

export const DECISION_TRUST_EN = {
  title: "Whom do you trust?",
  text: "Sera wants Ilse in chains. Ilse swears only her knowledge can stop the bishop. Both cannot stay.",
  options: ["Trust Sera (defense ×1.5)", "Trust Ilse (souls ×3)"] as readonly string[],
};

export const ACHIEVEMENTS_EN: Readonly<Record<string, Named>> = {
  first_coin: { name: "First Coin", description: "Collect taxes for the first time." },
  tax_collector: { name: "Tax Collector", description: "Collect taxes 1,000 times." },
  serfs_50: { name: "Lord of Hands", description: "Own 50 serfs." },
  gold_1e6: { name: "Prosperity", description: "Earn 1 million gold in total." },
  gold_1e9: { name: "Wealth", description: "Earn 1 billion gold in total." },
  gold_1e12: { name: "Immeasurable", description: "Earn 1 trillion gold in total." },
  swords_100: { name: "Armory", description: "Forge 100 swords in total." },
  soldiers_100: { name: "A Company", description: "Command 100 soldiers." },
  seals_10: { name: "Keeper of Seals", description: "Collect 10 Order seals." },
  fallen_500: { name: "Gravedigger", description: "500 fallen rest in the crypt." },
  laborers_50: { name: "Taskmaster", description: "Force 50 prisoners into labour." },
  souls_1e6: { name: "Shepherd of Souls", description: "Collect 1 million souls in total." },
  all_research: { name: "The Great Work", description: "Complete all research." },
  faith_1e6: { name: "Rock of Faith", description: "Collect 1 million faith in total." },
  first_ritual: { name: "From the Ashes", description: "Perform the Ritual of Ash." },
  ash_50: { name: "Phoenix", description: "Collect 50 ash." },
  siege_won: { name: "The Walls Hold", description: "Repel every wave of the siege." },
  ending_light: { name: "The Light of Vhal", description: "Reach the light ending." },
  ending_ash: { name: "The New Master", description: "Reach the ash ending." },
};
