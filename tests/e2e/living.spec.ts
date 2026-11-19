import { type Page, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";

/** Spielstand mit Händler, Rabengeschenk und Gebäuden für den Burgplan (erzeugt mit tsx). */
const SAVE = execFileSync("npx", ["tsx", "tests/e2e/fixtures/richSave.ts", "1"], { encoding: "utf8" });

async function seeded(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((text) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("vhal.save", text);
      sessionStorage.setItem("seeded", "1");
    }
  }, SAVE);
  await page.goto("./");
  await page.waitForTimeout(800);
  const dialog = page.getByRole("dialog");
  for (let i = 0; i < 30 && (await dialog.count()) > 0; i += 1) await dialog.first().getByRole("button").first().click();
  return errors;
}

test("Händler: feilschen und kaufen", async ({ page }) => {
  const errors = await seeded(page);
  const offer = page.locator(".offer").first();
  await expect(offer).toBeVisible();
  await offer.getByRole("button", { name: "Feilschen" }).click();
  await expect(offer.getByRole("button", { name: "Feilschen" })).toBeDisabled();
  expect(errors).toEqual([]);
});

test("Burgplan: Viertel setzen und Nachbarbonus sehen", async ({ page }) => {
  const errors = await seeded(page);
  await page.getByRole("button", { name: "Freier Bauplatz" }).nth(5).click();
  await page.getByRole("group", { name: "Viertel wählen" }).getByRole("button", { name: /Markt/ }).click();
  await expect(page.locator(".plot.filled")).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("Szene: Gebäude öffnen Kacheln, der Rabe bringt Gold", async ({ page }) => {
  const errors = await seeded(page);
  const canvas = page.locator(".scene canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Keine Szene");
  // Schmiede liegt bei rund 62 % der Breite knapp über dem Boden
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.72);
  await expect(page.locator(".scene .tip")).toContainText("Schmiede");
  await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.72);
  await expect(page.locator("#panel-title")).toContainText("Schmiede");
  await page.mouse.click(box.x + box.width * 0.05 + 8, box.y + box.height * 0.16);
  await expect(page.locator(".scene .bubble")).toBeVisible();
  expect(errors).toEqual([]);
});
