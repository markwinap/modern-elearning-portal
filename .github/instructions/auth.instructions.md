---
applyTo: "src/server/better-auth/**,src/app/api/auth/**,src/app/**/login/**,src/app/**/register/**,middleware.ts"
---

# better-auth v1.3 Rules

## Project Auth Setup

This project uses **better-auth** (not Auth.js/NextAuth). Key files:

- `src/server/better-auth/config.ts` — `betterAuth({ database: drizzleAdapter, emailAndPassword, socialProviders: { github } })`
- `src/server/better-auth/index.ts` — re-exports `auth`
- `src/server/better-auth/server.ts` — `getSession()` cached server-side helper
- `src/server/better-auth/client.ts` — `authClient` from `createAuthClient()`
- `src/app/api/auth/[...all]/route.ts` — catch-all auth handler via `toNextJsHandler(auth)`

## Server Component — Check Session

```typescript
import { getSession } from "~/server/better-auth/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return <div>Welcome {session.user.name}</div>;
}
```

## Protected Route Group Layout

```typescript
// src/app/(dashboard)/layout.tsx
import { getSession } from "~/server/better-auth/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return <>{children}</>;
}
```

## tRPC Context

```typescript
// ctx.session from better-auth — null when unauthenticated
// ctx.session.user.id — string (text PK, managed by better-auth)
// Use protectedProcedure — throws UNAUTHORIZED when ctx.session?.user is absent
export const myRouter = createTRPCRouter({
  myData: protectedProcedure.query(({ ctx }) => {
    return getData(ctx.session.user.id); // user.id is always string
  }),
});
```

## Client — Session Hook

```typescript
"use client";
import { authClient } from "~/server/better-auth/client";

export function UserMenu() {
  const { data: session } = authClient.useSession();
  if (!session) return null;
  return <span>{session.user.name}</span>;
}
```

## Client — Sign In with Email + Password

```typescript
"use client";
import { authClient } from "~/server/better-auth/client";
import { Button, Form, Input, App } from "antd";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const { message } = App.useApp();
  const router = useRouter();

  const handleSubmit = async (values: { email: string; password: string }) => {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: "/dashboard",
    });
    if (error) {
      void message.error(error.message ?? "Sign in failed");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit}>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
        <Input autoComplete="email" />
      </Form.Item>
      <Form.Item name="password" label="Password" rules={[{ required: true }]}>
        <Input.Password autoComplete="current-password" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" block>Sign In</Button>
      </Form.Item>
    </Form>
  );
}
```

## Client — Social Sign In (GitHub)

```typescript
"use client";
import { authClient } from "~/server/better-auth/client";
import { Button } from "antd";
import { GithubOutlined } from "@ant-design/icons";

export function GithubSignIn() {
  return (
    <Button
      icon={<GithubOutlined />}
      block
      onClick={() => authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" })}
    >
      Continue with GitHub
    </Button>
  );
}
```

## Client — Sign Out

```typescript
"use client";
import { authClient } from "~/server/better-auth/client";
import { Button } from "antd";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      onClick={() =>
        authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })
      }
    >
      Sign Out
    </Button>
  );
}
```

## Auth Route Handler

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "~/server/better-auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

## Role-Based tRPC Procedure (if roles are added)

```typescript
// src/server/api/trpc.ts — add after protectedProcedure:
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});
```

## Configuration

```typescript
// src/server/auth.ts
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "~/server/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "~/server/db/schema";
import { env } from "~/env";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
    GithubProvider({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.sub! },
    }),
    jwt: ({ token, user }) => {
      if (user) token.sub = user.id;
      return token;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
});
```

## Auth Schema Tables (required for DrizzleAdapter)

```typescript
// Add to src/server/db/schema.ts
import { integer, primaryKey } from "drizzle-orm/pg-core";

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }),
);
```

## Usage Patterns

### Server Component — get session

```typescript
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <div>Welcome {session.user.name}</div>;
}
```

### Route Handler — auth route

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "~/server/auth";
export const { GET, POST } = handlers;
```

### Middleware — protect routes

```typescript
// middleware.ts
import { auth } from "~/server/auth";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;

  const protectedPaths = ["/dashboard", "/settings", "/profile"];
  const isProtected = protectedPaths.some((p) =>
    nextUrl.pathname.startsWith(p),
  );

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

### Client Component — sign in/out

```typescript
"use client";
import { signIn, signOut } from "next-auth/react";
import { Button } from "antd";

export function AuthButtons({ session }: { session: Session | null }) {
  if (session) {
    return <Button onClick={() => signOut({ callbackUrl: "/" })}>Sign out</Button>;
  }
  return (
    <>
      <Button onClick={() => signIn("google")}>Sign in with Google</Button>
      <Button onClick={() => signIn("github")}>Sign in with GitHub</Button>
    </>
  );
}
```

## Session Type Augmentation

```typescript
// src/types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: "user" | "admin" | "moderator";
    };
  }
}
```
