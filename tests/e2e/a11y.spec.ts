import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

/** Prüft die aktuelle Ansicht; schwere und kritische Verstöße lassen den Test scheitern. */
async function audit(page: Page, label: string): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const report = serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
  expect(report, `${label}\n${report.join("\n")}`).toEqual([]);
}

test("Barrierefreiheit: Story-Dialog, Burgfried und Chronik", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("dialog")).toBeVisible();
  await audit(page, "Story-Dialog");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await audit(page, "Burgfried");
  await page.locator("button.tile", { hasText: "Chronik" }).click();
  await audit(page, "Chronik");
});

test("Tastatur: Tab erreicht Kacheln und Knöpfe in sinnvoller Reihenfolge", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: "Weiter" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Zum Inhalt/ })).toBeFocused();
  const focused: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press("Tab");
    focused.push(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim().slice(0, 30) ?? ""));
  }
  expect(focused.some((t) => t.includes("Burgfried"))).toBe(true);
  expect(focused.some((t) => t.includes("Chronik"))).toBe(true);
});
