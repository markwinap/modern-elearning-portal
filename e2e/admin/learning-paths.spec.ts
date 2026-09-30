import { expect, test } from "@playwright/test";

// Runs authenticated as an admin via the "chromium-admin" project's
// storageState (see e2e/auth.setup.ts and playwright.config.ts).
test.describe("admin learning paths crud", () => {
  test("creates, updates, and deletes a learning path", async ({ page }) => {
    const title = `E2E Learning Path ${Date.now()}`;
    const updatedTitle = `${title} (updated)`;

    await page.goto("/admin/learning-paths");
    await expect(
      page.getByRole("heading", { name: "Learning Paths" }),
    ).toBeVisible();

    // Create
    await page.getByRole("button", { name: "New learning path" }).click();
    await expect(
      page.getByRole("dialog", { name: "New learning path" }),
    ).toBeVisible();
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Status").click();
    await page.locator(".ant-select-item-option", { hasText: "Published" }).click();
    await page.getByRole("button", { name: "OK" }).click();

    await expect(page.getByText("Learning path created")).toBeVisible();
    await expect(page.getByRole("cell", { name: title })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "published" }),
    ).toBeVisible();

    // Update
    const row = page.getByRole("row").filter({ hasText: title });
    await row.getByRole("button", { name: "Edit" }).click();
    await expect(
      page.getByRole("dialog", { name: new RegExp(`Edit "${title}"`) }),
    ).toBeVisible();
    await page.getByLabel("Title").fill(updatedTitle);
    await page.getByLabel("Status").click();
    await page.locator(".ant-select-item-option", { hasText: "Draft" }).click();
    await page.getByRole("button", { name: "OK" }).click();

    await expect(page.getByText("Learning path updated")).toBeVisible();
    await expect(page.getByRole("cell", { name: updatedTitle })).toBeVisible();
    await expect(page.getByRole("cell", { name: "draft" })).toBeVisible();

    // Delete
    const updatedRow = page.getByRole("row").filter({ hasText: updatedTitle });
    await updatedRow.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete" }).last().click();

    await expect(page.getByText("Learning path deleted")).toBeVisible();
    await expect(page.getByRole("cell", { name: updatedTitle })).not.toBeVisible();
  });
});
