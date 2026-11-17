import { type Page, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";

/** Spielstand von vor einer Stunde mit Burgfried, Rittersaal und Leibeigenen (erzeugt mit tsx). */
const SAVE = execFileSync("npx", ["tsx", "tests/e2e/fixtures/oldSave.ts"], { encoding: "utf8" });

async function seed(page: Page): Promise<void> {
  await page.addInitScript((text) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("vhal.save", text);
      sessionStorage.setItem("seeded", "1");
    }
  }, SAVE);
}

test("Zeitraffer im Worker: lange Abwesenheit ergibt einen Bericht", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await seed(page);
  await page.goto("./");
  await expect(page.getByRole("status").filter({ hasText: /Abwesenheit/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("dialog", { name: "Zeitraffer" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Rittersaal, Kodex und Statistik sind erreichbar", async ({ page }) => {
  await seed(page);
  await page.goto("./");
  await expect(page.getByRole("status").filter({ hasText: /Abwesenheit/ })).toBeVisible({ timeout: 15_000 });
  // Nachgeholte Szenen und Ereignisse wegklicken, bis die Burg wieder bedienbar ist.
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 30 && (await dialog.count()) > 0; i += 1) await dialog.first().getByRole("button").first().click();
  await page.locator("button.tile", { hasText: "Rittersaal" }).click();
  await expect(page.getByRole("heading", { name: /Gefolge/ })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Kirche" })).toBeVisible();
  await page.locator("button.tile", { hasText: "Chronik" }).click();
  await expect(page.getByRole("heading", { name: /Kodex/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Wappen/ })).toBeVisible();
});
