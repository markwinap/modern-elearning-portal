---
name: auth-patterns
description: "Implement authentication flows, protected routes, session handling, and role-based access control using better-auth v1.3. Use when adding login, register, OAuth (GitHub), sign-out, or route protection features."
---

# better-auth v1.3 Patterns Skill

You will implement authentication features for this T3 Stack project using **better-auth**.

## Step 1: Read the Auth Setup

Read these files first:

- `src/server/better-auth/config.ts` — betterAuth config (providers, database adapter)
- `src/server/better-auth/server.ts` — `getSession()` server helper
- `src/server/better-auth/client.ts` — `authClient` for client components
- `src/server/db/schema.ts` — `user`, `session`, `account`, `verification` tables (managed by better-auth)
- `src/app/api/auth/[...all]/route.ts` — catch-all route handler

## Step 2: Identify What to Implement

Common auth tasks:

- **Protected page** → use `getSession()` + redirect in Server Component
- **Protected route group** → add `layout.tsx` with session check
- **Email sign-in form** → `authClient.signIn.email()` in Client Component
- **Social sign-in** → `authClient.signIn.social({ provider: "github" })`
- **Sign-out button** → `authClient.signOut()`
- **Session in UI** → `authClient.useSession()` hook

## Implementation Patterns

### Protected Route Group Layout

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

### Role-Based tRPC Procedure

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

### Login Page Structure

```typescript
// src/app/(auth)/login/page.tsx
import type { Metadata } from "next";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <LoginForm />
    </div>
  );
}
```

```typescript
// src/app/(auth)/login/_components/LoginForm.tsx
"use client";
import { App, Button, Card, Divider, Form, Input } from "antd";
import { GithubOutlined } from "@ant-design/icons";
import { authClient } from "~/server/better-auth/client";
import { useRouter } from "next/navigation";

interface LoginValues {
  email: string;
  password: string;
}

export function LoginForm() {
  const { message } = App.useApp();
  const router = useRouter();
  const [form] = Form.useForm<LoginValues>();

  const handleEmail = async (values: LoginValues) => {
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
    <Card title="Sign In" style={{ width: 400 }}>
      <Button
        icon={<GithubOutlined />}
        block
        size="large"
        onClick={() => authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" })}
      >
        Continue with GitHub
      </Button>
      <Divider>or</Divider>
      <Form form={form} layout="vertical" onFinish={handleEmail}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true }]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block size="large">Sign In</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
```

### Session Display in Navigation

```typescript
"use client";
import { authClient } from "~/server/better-auth/client";
import { Avatar, Button } from "antd";
import { useRouter } from "next/navigation";

export function NavUser() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  if (!session) {
    return <Button onClick={() => router.push("/login")}>Sign In</Button>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Avatar src={session.user.image}>{session.user.name?.[0]}</Avatar>
      <Button
        size="small"
        onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
      >
        Sign Out
      </Button>
    </div>
  );
}
```

## Step 3: Verify

- Sign out, try to access protected page → should redirect to /login
- Sign in with email/password → should reach /dashboard
- Sign in with GitHub → should complete OAuth flow to /dashboard
- `ctx.session.user.id` in tRPC procedure is a `string` (text PK, not number/UUID)
