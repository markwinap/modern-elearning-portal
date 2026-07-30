import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

// Saved storage state (session cookies) from e2e/auth.setup.ts, reused by
// authenticated tests so they don't need to sign in themselves.
const teacherAuthFile = "e2e/.auth/teacher.json";
const studentAuthFile = "e2e/.auth/student.json";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      testIgnore: "student/**",
      use: { ...devices["Desktop Chrome"], storageState: teacherAuthFile },
      dependencies: ["setup"],
    },
    {
      name: "chromium-student",
      testMatch: "student/**",
      use: { ...devices["Desktop Chrome"], storageState: studentAuthFile },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
