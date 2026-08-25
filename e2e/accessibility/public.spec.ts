import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("public pages a11y", () => {
  test("login page has no detectable a11y violations", async ({ page }) => {
    await page.goto("/login");
    await page.locator("h1").first().waitFor({ state: "visible" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("course catalog page has no detectable a11y violations", async ({
    page,
  }) => {
    await page.goto("/courses");
    await page.locator("h1").first().waitFor({ state: "visible" });
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
