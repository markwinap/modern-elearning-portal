---
description: "Scaffold a complete better-auth authentication flow: sign-in page, sign-up page, and protected route layout wired to better-auth v1.3."
argument-hint: "[feature] e.g. login page, register page, or protected dashboard layout"
tools:
  [
    "read_file",
    "create_file",
    "replace_string_in_file",
    "run_in_terminal",
    "file_search",
  ]
---

Scaffold a complete better-auth authentication flow for: **${input:feature:login page / register page / protected layout}**

## Pre-Flight Checklist

Before writing any code, read these files:

- `src/server/better-auth/config.ts` — confirm configured providers (email+password, GitHub)
- `src/server/better-auth/client.ts` — confirm `authClient` export
- `src/server/better-auth/server.ts` — confirm `getSession` export
- `src/app/layout.tsx` — note existing providers/wrappers

## Requirements

### Sign-In Page (`src/app/(auth)/login/page.tsx`)

- Server Component page with `export const metadata`
- Renders `<LoginForm />` client component centered on screen
- `LoginForm` uses `authClient.signIn.email()` for email/password
- `LoginForm` uses `authClient.signIn.social({ provider: "github" })` for OAuth
- Use `App.useApp()` for `message.error()` feedback (no standalone `message.error`)
- Redirect to `/dashboard` on success via `router.push`

### Register Page (`src/app/(auth)/register/page.tsx`)

- Server Component page with `export const metadata`
- Renders `<RegisterForm />` client component
- `RegisterForm` uses `authClient.signUp.email({ email, password, name })`
- Show validation errors from the response

### Protected Route Layout (`src/app/(dashboard)/layout.tsx`)

- Server Component layout
- Call `await getSession()` from `~/server/better-auth/server`
- If `!session?.user` → `redirect("/login")`
- Pass `session` as prop to children if needed

## Code Structure Template

### Login page

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

interface LoginValues { email: string; password: string; }

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
    if (error) void message.error(error.message ?? "Sign in failed");
    else router.push("/dashboard");
  };

  return (
    <Card title="Sign In" style={{ width: 400 }}>
      <Button
        icon={<GithubOutlined />} block size="large"
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

### Protected layout

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

## Verification Steps

1. Navigate to the protected route while signed out → should redirect to /login
2. Sign in with email → should reach /dashboard
3. Sign in with GitHub → should complete OAuth flow
4. Sign out → session cleared, protected routes redirect again
5. Run `npx tsc --noEmit` — no type errors
