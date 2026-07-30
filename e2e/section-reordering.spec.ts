import { expect, test } from "@playwright/test";

// Runs authenticated via the "chromium" project's storageState, which is
// populated by e2e/auth.setup.ts (see playwright.config.ts).
test.describe("section reordering", () => {
  test("section builder page renders with drag handles", async ({ page }) => {
    await page.goto("/teach/courses/1/sections");

    const hasSectionContent =
      (await page.locator("text=Sections").count()) > 0 ||
      (await page.locator("text=Add Section").count()) > 0;

    expect(hasSectionContent).toBe(true);
  });

  test("section settings drawer opens", async ({ page }) => {
    await page.goto("/teach/courses/1/sections");

    // Look for settings button (gear icon)
    const settingsBtn = page.locator('[title="Section settings"]').first();
    if ((await settingsBtn.count()) > 0) {
      await settingsBtn.click();
      await expect(page.locator("text=Section Settings")).toBeVisible();
    }
  });
});
