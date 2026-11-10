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
};
const BOT_SPEED_FACTOR = 0.72;

const fmt = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const result = runBot({ maxSeconds: 4 * 3600, stopAtNode: "a1_grey_banner" });
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
console.log(`\nAkt I ${result.reachedStop ? "abgeschlossen" : "NICHT abgeschlossen"} nach ${fmt(result.seconds)} (Bot).`);
console.log("Gebäude:", JSON.stringify(v.buildings));
console.log("Upgrades:", Object.entries(v.upgrades).filter(([, b]) => b).map(([k]) => k).join(", "));
console.log(`Schwerter: ${v.resources.swords.toString()}, Gold/s: ${result.sim.rates.gold.toNumber().toFixed(0)}`);

if (process.argv.includes("--csv")) {
  const csv = ["id,act,title,bot_seconds,target_bot_seconds"]
    .concat(rows.map((r) => `${r.id},${r.act},"${r.title}",${r.seconds},${r.targetBot ?? ""}`))
    .join("\n");
  writeFileSync("sim-report.csv", `${csv}\n`);
  console.log("CSV geschrieben: sim-report.csv");
}
