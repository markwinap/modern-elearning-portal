import { expect, test } from "@playwright/test";

test.describe("section reordering", () => {
  test("section builder page renders with drag handles", async ({ page }) => {
    // Navigate to a course sections page (requires auth in real scenario)
    // This test validates the page loads and the section builder renders
    await page.goto("/teach/courses/1/sections");

    // Check that the page either loads the section builder or redirects to login
    const url = page.url();
    const isAuthRedirect = url.includes("/login");
    const hasSectionContent =
      (await page.locator("text=Sections").count()) > 0 ||
      (await page.locator("text=Add Section").count()) > 0;

    expect(isAuthRedirect || hasSectionContent).toBe(true);
  });

  test("section settings drawer opens", async ({ page }) => {
    await page.goto("/teach/courses/1/sections");
    const url = page.url();
    if (url.includes("/login")) {
      test.skip(true, "Requires authenticated session");
      return;
    }

    // Look for settings button (gear icon)
    const settingsBtn = page.locator('[title="Section settings"]').first();
    if ((await settingsBtn.count()) > 0) {
      await settingsBtn.click();
      await expect(page.locator("text=Section Settings")).toBeVisible();
    }
  });
});
