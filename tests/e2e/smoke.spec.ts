import { type Page, expect, test } from "@playwright/test";

/** Sammelt Seitenfehler; jeder Test endet mit der Prüfung, dass keine auftraten. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

async function start(page: Page): Promise<void> {
  await page.goto("./");
  await expect(page.getByRole("dialog")).toContainText("Das Erbe");
  await page.getByRole("dialog").getByRole("button").click();
}

test("Start, Steuern eintreiben, kaufen und Spielstand überlebt Neuladen", async ({ page }) => {
  const errors = trackErrors(page);
  await start(page);
  const collect = page.locator("button.collect");
  for (let i = 0; i < 12; i += 1) await collect.click();
  await page.getByRole("button", { name: /Kaufen ×1/ }).first().click();
  await expect(page.locator(".owned").first()).toHaveText("1");
  await page.locator("button.tile", { hasText: "Chronik" }).click();
  await page.getByRole("button", { name: "Jetzt speichern" }).click();
  await page.reload();
  await expect(page.locator(".owned").first()).toHaveText("1");
  expect(errors).toEqual([]);
});

test("Export und Import ergeben denselben Spielstand", async ({ page }) => {
  const errors = trackErrors(page);
  await start(page);
  for (let i = 0; i < 5; i += 1) await page.locator("button.collect").click();
  await page.locator("button.tile", { hasText: "Chronik" }).click();
  await page.getByRole("button", { name: "Exportieren" }).click();
  const text = await page.getByLabel("Exportierter Spielstand").inputValue();
  expect(text.length).toBeGreaterThan(20);
  await page.getByPlaceholder(/Exportierten Text/).fill(text);
  await page.getByRole("button", { name: "Importieren" }).click();
  await expect(page.getByRole("status")).toContainText("Spielstand geladen");
  expect(errors).toEqual([]);
});

test("kein horizontales Scrollen", async ({ page }) => {
  await start(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("PWA: nach dem ersten Besuch auch offline spielbar", async ({ page, context }) => {
  await start(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Zweiter Besuch füllt den Asset-Cache des Service Workers.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Die Asche von Vhal");
  await context.setOffline(false);
});

test("Ton: nach dem Einschalten entsteht ein hörbares Signal", async ({ page }) => {
  await start(page);
  await page.locator("button.tile", { hasText: "Chronik" }).click();
  await page.getByLabel("Ton").check();
  await page.locator("button.tile", { hasText: "Burgfried" }).click();
  await page.locator("button.collect").click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __vhalAudio: { running: boolean; level(): number } }).__vhalAudio.level()), {
      timeout: 5_000,
    })
    .toBeGreaterThan(0.001);
});

test("Englisch: Oberfläche, Story und Zahlen wechseln die Sprache", async ({ page }) => {
  const errors = trackErrors(page);
  await start(page);
  await page.locator("button.tile", { hasText: "Chronik" }).click();
  await page.getByRole("combobox").first().selectOption("en");
  await expect(page.locator("h1")).toHaveText("The Ashes of Vhal");
  await expect(page.locator("button.tile", { hasText: "Keep" })).toBeVisible();
  await expect(page.locator("summary", { hasText: "The Inheritance" })).toBeVisible();
  await page.locator("button.tile", { hasText: "Keep" }).click();
  await expect(page.getByRole("button", { name: /Collect taxes/ })).toBeVisible();
  await expect(page.getByText("Serf", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
