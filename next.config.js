/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds. Skip validation while linting so ESLint can run without a populated `.env`.
 */
const isLintCommand = process.argv.includes("lint");

if (!isLintCommand) {
  await import("./src/env.js");
}

/** @type {import("next").NextConfig} */
const config = {};

export default config;
