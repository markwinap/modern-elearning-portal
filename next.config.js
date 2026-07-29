/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds. Skip validation while linting so ESLint can run without a populated `.env`.
 */
const isLintCommand = process.argv.includes("lint");

if (!isLintCommand) {
  await import("./src/env.js");
}

/** @type {import("next").NextConfig} */
const config = {
  outputFileTracingRoot: import.meta.dirname,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default config;
