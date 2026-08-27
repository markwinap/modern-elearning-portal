import { expect, test } from "@playwright/test";

test.describe("mobile learner flows", () => {
  test("dashboard loads and shows bottom navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.locator("nav[aria-label='Mobile navigation']"),
    ).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  test("can browse and open a course from the catalog", async ({ page }) => {
    await page.goto("/courses");
    await page.locator("h1").first().waitFor({ state: "visible" });

    const firstCourse = page.locator("a", { hasText: "View Course" }).first();
    await expect(firstCourse).toBeVisible();

    const href = await firstCourse.getAttribute("href");
    expect(href).toBeTruthy();
    await firstCourse.click();
    await page.waitForURL(href!);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("offline indicator appears when network is disabled", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.locator("h1").first().waitFor({ state: "visible" });

    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    await expect(page.getByTestId("offline-indicator")).toContainText(
      "You are offline",
    );

    await page.evaluate(() => window.dispatchEvent(new Event("online")));
  });
});
