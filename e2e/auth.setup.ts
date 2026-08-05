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

  const response = await page.request.post(
    "http://localhost:3000/api/auth/sign-in/email",
    {
      data: { email, password },
      headers: {
        Origin: "http://localhost:3000",
        Referer: "http://localhost:3000/login",
      },
    },
  );

  if (!response.ok()) {
    const body = await response.text().catch(() => "unknown");
    throw new Error(
      `Sign-in for ${email} failed with status ${response.status()}: ${body}`,
    );
  }

  // The Set-Cookie header is stored in the shared context, so visiting the
  // dashboard confirms the session is active before saving the storage state.
  await page.goto("/dashboard");
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
