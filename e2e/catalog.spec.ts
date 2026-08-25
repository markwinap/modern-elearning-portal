import { expect, test } from "@playwright/test";

test.describe("public course catalog", () => {
  test("anonymous users can browse published courses", async ({ page }) => {
    await page.goto("/courses");
    await expect(
      page.getByRole("heading", { name: /course catalog/i }),
    ).toBeVisible();
  });
});
