import { expect, test } from "@playwright/test";

// Runs authenticated as a student via the "chromium-student" project's
// storageState, populated by e2e/auth.setup.ts (see playwright.config.ts).
test.describe("student quiz taking", () => {
  test("dashboard loads without redirecting to login", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).not.toHaveURL(/\/login$/);
  });
});
