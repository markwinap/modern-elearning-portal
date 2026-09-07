import { expect, test } from "@playwright/test";

test.describe("learner dashboard and global search", () => {
  test("dashboard shows personalized welcome for a student", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { level: 1, name: /Welcome back/ }),
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='continue-learning-section']").first(),
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='recommendations-section']").first(),
    ).toBeVisible();
  });

  test("global search input navigates to results page", async ({ page }) => {
    await page.goto("/dashboard");
    const search = page.getByPlaceholder(/Search\.\.\. \(/);
    await expect(search).toBeVisible();

    await search.fill("course");
    await search.press("Enter");

    await expect(page).toHaveURL(/\/search\?q=course/);
    await expect(page.locator("h1")).toContainText("Search");
  });

  test("search results page supports filters", async ({ page }) => {
    await page.goto("/search?q=course");

    const typeFilter = page.getByLabel("Filter results by type");
    await expect(typeFilter).toBeVisible();

    await typeFilter.click();
    await page
      .locator(".ant-select-item-option", { hasText: "Course" })
      .first()
      .click();
    await page.keyboard.press("Escape");

    await expect(
      page.locator(".ant-badge", { hasText: "course" }).first(),
    ).toBeVisible();
  });
});
