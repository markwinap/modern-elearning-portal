import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { env } from "~/env";
import { db } from "~/server/db";
import { account, session, user, verification } from "~/server/db/schema";

export const auth = betterAuth({
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  plugins: [admin({ defaultRole: "student" })],
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/github`,
    },
  },
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
  rateLimit: {
    enabled: env.NODE_ENV === "production",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/*": { window: 60, max: 10 },
      "/sign-up/*": { window: 60, max: 10 },
      "/forget-password": { window: 60, max: 5 },
      "/api/auth/callback/*": { window: 60, max: 20 },
    },
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
    disableCSRFCheck: false,
    disableOriginCheck: false,
  },
});

export type Session = typeof auth.$Infer.Session;
