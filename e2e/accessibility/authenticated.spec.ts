import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("authenticated pages a11y", () => {
  test("dashboard has no detectable a11y violations", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator("h1").first().waitFor({ state: "visible" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("teacher course list has no detectable a11y violations", async ({
    page,
  }) => {
    await page.goto("/teach");
    await page.locator("h1").first().waitFor({ state: "visible" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("search page has no detectable a11y violations", async ({ page }) => {
    await page.goto("/search?q=course");
    await page.locator("h1").first().waitFor({ state: "visible" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
