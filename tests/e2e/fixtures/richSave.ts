/** Weit fortgeschrittener Spielstand für E2E-Tests der Szene und der neuen Systeme (Argument: Jahreszeit 0–3). */
import { Decimal } from "../../../src/core/decimal";
import { exportSave } from "../../../src/game/persistence";
import { createInitialState } from "../../../src/game/state";
import { STORY } from "../../../src/content/story";
const season = Number(process.argv[2] ?? 0);
const s = createInitialState(Date.now());
for (const k of Object.keys(s.tiles) as (keyof typeof s.tiles)[]) s.tiles[k] = true;
s.flags.act1Complete = s.flags.act2Complete = true;
for (const n of STORY.slice(0, 18)) { s.story.completed.push(n.id); s.story.completedAt.push(0); }
s.stats.playSeconds = season * 900 + 10;
s.buildings.serf = 300; s.buildings.mill = 5; s.buildings.market = 3; s.buildings.woodcutter = 50; s.buildings.bell_tower = 1;
s.warroom.soldiers = 60; s.dungeon.prisoners = 6; s.siege.fortifications = { ...s.siege.fortifications };
s.forge.queue.push("sword");
s.merchant.present = true; s.merchant.timer = 600;
s.merchant.offers = [{ kind: "fortune", price: new Decimal(500), amount: new Decimal(0), mood: "new" }, { kind: "iron", price: new Decimal(800), amount: new Decimal(300), mood: "new" }];
s.raven.gift = true;
s.resources.gold = new Decimal(1e9); s.resources.iron = new Decimal(1e5);
s.retinue.gunther = { level: 3, office: "bailiff", equipped: true, loyalty: 60, quest: 0, questRemaining: null };
s.plan[0] = "serf"; s.plan[1] = "mill";
process.stdout.write(exportSave(s));
