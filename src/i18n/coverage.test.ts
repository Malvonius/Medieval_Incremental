import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translateText } from "./index";
import { UI_EN } from "./ui.en";

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".svelte") ? [join(dir, e.name)] : []));

describe("Englische Oberflächentexte", () => {
  it("jeder wörtliche $tx-Text hat eine Übersetzung", () => {
    const missing = files("src/ui").flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/\$tx\("((?:[^"\\]|\\.)*)"/g)].map((m) => m[1] ?? "").filter((de) => !(de in UI_EN)).map((de) => `${file}: ${de}`),
    );
    expect(missing).toEqual([]);
  });

  it("ersetzt Platzhalter", () => {
    expect(translateText("en", "Du warst {time} fort. Deine Leute haben {gold} Gold erwirtschaftet.", { time: "3 h", gold: "5" })).toBe(
      "You were away for 3 h. Your people earned 5 gold.",
    );
  });
});

describe("Englische Spielmeldungen", () => {
  it("jede feste Fehlermeldung der Spiellogik hat eine Übersetzung", () => {
    const dir = "src/game";
    const messages = readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
      .flatMap((f) => [...readFileSync(join(dir, f), "utf8").matchAll(/fail\("([^"]+)"\)|^\s+\w+: "([A-ZÄÖÜ][^"]{8,}\.)",$/gm)])
      .map((m) => m[1] ?? m[2] ?? "");
    expect(messages.length).toBeGreaterThan(20);
    expect(messages.filter((de) => !(de in UI_EN))).toEqual([]);
  });
});
