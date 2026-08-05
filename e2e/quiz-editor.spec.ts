import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

interface Fixture {
  courseId: number;
  courseSlug: string;
  activityId: number;
}

const fixturePath = fileURLToPath(
  new URL("./e2e-fixtures.json", import.meta.url),
);
const fixtures: Fixture | null = existsSync(fixturePath)
  ? (JSON.parse(readFileSync(fixturePath, "utf-8")) as Fixture)
  : null;

// Runs authenticated as a teacher via the "chromium" project's storageState.
test.describe("quiz editor features", () => {
  test.beforeEach(async ({ page }) => {
    if (!fixtures) {
      test.skip();
      return;
    }
    await page.goto(
      `/teach/courses/${fixtures.courseId}/activities/${fixtures.activityId}`,
    );
    // Wait for the quiz settings UI to confirm we landed on a quiz editor.
    await page.locator("text=Quiz Settings").last().waitFor();
  });

  test("new anti-cheating settings are present", async ({ page }) => {
    await expect(
      page.getByText("Questions Per Attempt (0 = all)").last(),
    ).toBeVisible();
    await expect(page.getByText("One question at a time").last()).toBeVisible();
    await expect(
      page.getByText("When to show the answer key").last(),
    ).toBeVisible();
    await expect(page.getByText("Available until").last()).toBeVisible();
  });

  test("question preview opens a modal", async ({ page }) => {
    // The editor renders an EyeOutlined preview button for each question.
    const eyeButton = page
      .getByRole("button", { name: "Preview question" })
      .first();
    await eyeButton.click();

    await expect(page.locator("text=Question Preview")).toBeVisible();
  });
});
