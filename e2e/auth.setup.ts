import path from "node:path";

import { test as setup, expect, type Page } from "@playwright/test";

async function signInAndSave(
  page: Page,
  {
    email,
    password,
    envVarNames,
    storagePath,
  }: {
    email: string | undefined;
    password: string | undefined;
    envVarNames: string;
    storagePath: string;
  },
) {
  if (!email || !password) {
    throw new Error(
      `${envVarNames} must be set (see .env.example) to run authenticated e2e tests.`,
    );
  }

  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();

  // Sign-in redirects away from /login once the session cookie is set.
  await expect(page).not.toHaveURL(/\/login$/);

  await page.context().storageState({ path: storagePath });
}

setup("authenticate as teacher", async ({ page }) => {
  await signInAndSave(page, {
    email: process.env.E2E_TEACHER_EMAIL,
    password: process.env.E2E_TEACHER_PASSWORD,
    envVarNames: "E2E_TEACHER_EMAIL and E2E_TEACHER_PASSWORD",
    storagePath: path.join(import.meta.dirname, ".auth/teacher.json"),
  });
});

setup("authenticate as student", async ({ page }) => {
  await signInAndSave(page, {
    email: process.env.E2E_STUDENT_EMAIL,
    password: process.env.E2E_STUDENT_PASSWORD,
    envVarNames: "E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD",
    storagePath: path.join(import.meta.dirname, ".auth/student.json"),
  });
});
