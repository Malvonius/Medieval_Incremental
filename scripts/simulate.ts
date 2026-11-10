import { writeFileSync } from "node:fs";
import { runBot } from "../src/sim/bot";

/** Soll-Zeiten (menschlicher Spieler, Minuten) – der Bot spielt ca. Faktor 0,72 schneller. */
const TARGET_HUMAN_MINUTES: Readonly<Record<string, number>> = {
  a1_first_serfs: 2,
  a1_smith: 5,
  a1_first_blade: 9,
  a1_armory: 30,
  a1_ledger: 38,
  a1_grey_banner: 60,
  a2_council: 60,
  a2_first_blood: 64,
  a2_confession: 75,
  a2_seal: 88,
  a2_traitor: 120,
  a2_komturei: 150,
  a3_descent: 150,
  a3_first_souls: 155,
  a3_alchemist: 170,
  a3_first_work: 180,
  a3_voice: 200,
  a3_glass: 225,
  a3_stone: 270,
  a4_mass: 270,
  a4_first_faith: 273,
  a4_vow: 275,
  a4_sermon: 300,
  a4_betrayal: 330,
  a4_ashes: 345,
  a4_rebirth: 390,
};
const BOT_SPEED_FACTOR = 0.72;

const fmt = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const stopAtNode = process.argv.find((a) => a.startsWith("--until="))?.slice("--until=".length) ?? "a4_rebirth";
const result = runBot({ maxSeconds: 10 * 3600, stopAtNode });
const rows = result.milestones.map((m) => {
  const target = TARGET_HUMAN_MINUTES[m.id];
  const targetBot = target === undefined ? null : target * 60 * BOT_SPEED_FACTOR;
  const deviation = targetBot ? ((m.seconds - targetBot) / targetBot) * 100 : null;
  return { ...m, targetBot, deviation };
});

console.log("Knoten".padEnd(18), "Bot".padStart(7), "Soll".padStart(7), "Abw.".padStart(7), " Titel");
for (const r of rows) {
  console.log(
    r.id.padEnd(18),
    fmt(r.seconds).padStart(7),
    (r.targetBot === null ? "–" : fmt(r.targetBot)).padStart(7),
    (r.deviation === null ? "–" : `${r.deviation >= 0 ? "+" : ""}${r.deviation.toFixed(0)}%`).padStart(7),
    "",
    r.title,
  );
}
const v = result.sim.view;
console.log(`\n${stopAtNode} ${result.reachedStop ? "erreicht" : "NICHT erreicht"} nach ${fmt(result.seconds)} (Bot).`);
console.log("Gebäude:", JSON.stringify(v.buildings));
console.log("Upgrades:", Object.entries(v.upgrades).filter(([, b]) => b).map(([k]) => k).join(", "));
console.log(`Schwerter: ${v.resources.swords.toString()}, Gold/s: ${result.sim.rates.gold.toExponential(2)}`);
console.log("Kriegsrat:", JSON.stringify(v.warroom));
console.log("Kerker:", JSON.stringify(v.dungeon));
console.log("Kapelle:", JSON.stringify(v.chapel), "Ritual:", JSON.stringify(v.ritual), "Glaube/s:", result.sim.rates.faith.toExponential(2));
console.log("Alchemie:", JSON.stringify(v.alchemy), "Seelen/s:", result.sim.rates.souls.toExponential(2));

if (process.argv.includes("--csv")) {
  const csv = ["id,act,title,bot_seconds,target_bot_seconds"]
    .concat(rows.map((r) => `${r.id},${r.act},"${r.title}",${r.seconds},${r.targetBot ?? ""}`))
    .join("\n");
  writeFileSync("sim-report.csv", `${csv}\n`);
  console.log("CSV geschrieben: sim-report.csv");
}
