import { expect, test } from "@playwright/test";

// Runs authenticated as an admin via the "chromium-admin" project's
// storageState (see e2e/auth.setup.ts and playwright.config.ts).
test.describe("admin sidebar navigation", () => {
  test("shows all expected admin menu items", async ({ page }) => {
    await page.goto("/admin");

    for (const label of [
      "Overview",
      "Users",
      "Categories",
      "All Courses",
      "Settings",
      "Gamification",
      "Skills",
      "Learning Paths",
      "Security",
      "Notifications",
    ]) {
      await expect(page.getByRole("menuitem", { name: label })).toBeVisible();
    }
  });

  test("Learning Paths link navigates to the admin learning paths page", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.getByRole("menuitem", { name: "Learning Paths" }).click();

    await expect(page).toHaveURL(/\/admin\/learning-paths$/);
    await expect(
      page.getByRole("heading", { name: "Learning Paths" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New learning path" }),
    ).toBeVisible();
  });

  test("Skills link navigates to the admin skills page", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("menuitem", { name: "Skills" }).click();

    await expect(page).toHaveURL(/\/admin\/skills$/);
    await expect(
      page.getByRole("heading", { name: "Skills taxonomy" }),
    ).toBeVisible();
  });

  test("direct visit to admin learning paths renders for admins", async ({
    page,
  }) => {
    await page.goto("/admin/learning-paths");

    await expect(page).toHaveURL(/\/admin\/learning-paths$/);
    await expect(
      page.getByRole("button", { name: "New learning path" }),
    ).toBeVisible();
  });
});
