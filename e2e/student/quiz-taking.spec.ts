import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

interface Fixture {
  courseId: number;
  courseSlug: string;
  activityId: number;
}

const fixturePath = fileURLToPath(
  new URL("../e2e-fixtures.json", import.meta.url),
);
const fixtures: Fixture | null = existsSync(fixturePath)
  ? (JSON.parse(readFileSync(fixturePath, "utf-8")) as Fixture)
  : null;

// Runs authenticated as a student via the "chromium-student" project's
// storageState, populated by e2e/auth.setup.ts (see playwright.config.ts).
test.describe("student quiz taking", () => {
  test("dashboard loads without redirecting to login", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).not.toHaveURL(/\/login$/);
  });

  test("quiz overview renders for the seeded quiz activity", async ({
    page,
  }) => {
    if (!fixtures) {
      test.skip();
      return;
    }

    await page.goto(
      `/courses/${fixtures.courseSlug}/learn/${fixtures.activityId}`,
    );

    const quizOverview = page
      .locator("text=Quiz Overview")
      .or(page.locator("text=No attempts remaining"))
      .or(page.locator("text=Resume Quiz"));

    await expect(quizOverview).toBeVisible();
  });
});
