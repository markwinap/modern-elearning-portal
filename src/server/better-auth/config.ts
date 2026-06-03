import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";

import { env } from "~/env";
import { db } from "~/server/db";
import { account, session, user, verification } from "~/server/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  plugins: [
    admin({ defaultRole: "student" }),
  ],
  emailAndPassword: { enabled: true },
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/github`,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
