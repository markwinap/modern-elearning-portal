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

## Middleware — Optimistic Route Protection

better-auth has no `auth()` middleware wrapper. For an optimistic redirect, read the
session cookie with `getSessionCookie` (do **not** treat it as full validation — always
re-check with `getSession()` in the page/layout or `protectedProcedure`):

```typescript
// middleware.ts (root of project)
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
```
