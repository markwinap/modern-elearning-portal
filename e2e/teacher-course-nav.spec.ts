import { expect, test } from "@playwright/test";

// Runs authenticated as a teacher via the "chromium" project's storageState
// (see e2e/auth.setup.ts and playwright.config.ts).
//
// Regression coverage for the sidebar nav pointing to broken/wrong routes
// (see src/lib/nav-config.tsx): the "All Courses" link should lead to the
// teacher course list at `/teach`, and the "New Course" button on that page
// should lead to the create course form.
test.describe("teacher sidebar navigation", () => {
  test("All Courses link navigates to the teacher course list", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "All Courses" }).click();

    await expect(page).toHaveURL(/\/teach$/);
    await expect(
      page.getByRole("heading", { name: "All Courses" }),
    ).toBeVisible();
  });

  test("New Course button navigates to the create course form", async ({
    page,
  }) => {
    await page.goto("/teach");
    await page.getByRole("button", { name: "New Course" }).click();

    await expect(page).toHaveURL(/\/teach\/courses\/new$/);
    await expect(page.getByLabel("Course Title")).toBeVisible();
  });
});

test.describe("teacher can create and edit a course", () => {
  test("create course form creates a course and redirects to edit page", async ({
    page,
  }) => {
    const courseTitle = `E2E Created Course ${Date.now()}`;

    await page.goto("/teach/courses/new");
    await page.getByLabel("Course Title").fill(courseTitle);

    // Category is required; select the first available option.
    await page.getByLabel("Category").click();
    await page.locator(".ant-select-item-option").first().click();

    await page.getByRole("button", { name: "Create Course" }).click();

    await expect(page.getByText("Course created!")).toBeVisible();
    await expect(page).toHaveURL(/\/teach\/courses\/\d+\/edit$/);
    await expect(page.getByLabel("Course Title")).toHaveValue(courseTitle);
  });

  test("edit course form saves changes", async ({ page }) => {
    await page.goto("/teach");
    await page
      .getByRole("row")
      .filter({ hasText: "E2E" })
      .first()
      .getByRole("link", { name: "Edit" })
      .click();

    await expect(page).toHaveURL(/\/teach\/courses\/\d+\/edit$/);

    const updatedTitle = `E2E Edited Course ${Date.now()}`;
    const titleInput = page.getByLabel("Course Title");
    await titleInput.fill(updatedTitle);

    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByText("Course updated!")).toBeVisible();
  });
});
