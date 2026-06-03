---
name: nextjs-page
description: "Scaffold a complete Next.js App Router page with Server Component data fetching, metadata, loading skeleton, error boundary, and client component structure. Use when adding a new route or page."
---

# Next.js Page Scaffolding Skill

You will create a complete Next.js App Router page with all required files.

## Step 1: Read Context
- Check `src/server/api/root.ts` for available tRPC procedures
- Check `src/server/db/schema.ts` for available data types
- Check `src/app/layout.tsx` to understand available providers

## Step 2: Create Page Files

### `page.tsx` — Server Component
```typescript
// NO "use client" — this is a Server Component
import { type Metadata } from "next";
import { api } from "~/trpc/server";
import { auth } from "~/server/auth";
import { redirect, notFound } from "next/navigation";
import { [Feature]List } from "./_components/[Feature]List";

export const metadata: Metadata = {
  title: "[Page Title] | App Name",
  description: "[Page description for SEO]",
};

export default async function [Feature]Page() {
  // Auth check (if protected)
  const session = await auth();
  if (!session) redirect("/login");

  // Parallel data fetching
  const [items, stats] = await Promise.all([
    api.[feature].getAll({ page: 1, pageSize: 20 }),
    api.[feature].getStats(),
  ]);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-6">[Page Title]</h1>
      <[Feature]List initialData={items} />
    </main>
  );
}
```

### `loading.tsx` — Skeleton State
```typescript
"use client";
import { Skeleton, Card } from "antd";

export default function Loading() {
  return (
    <main className="p-6">
      <Skeleton.Input active size="large" className="mb-6" />
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </main>
  );
}
```

### `error.tsx` — Error Boundary
```typescript
"use client";
import { Result, Button } from "antd";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <Result
      status="error"
      title="Something went wrong"
      subTitle={error.message}
      extra={
        <Button type="primary" onClick={reset}>Try Again</Button>
      }
    />
  );
}
```

### `_components/[Feature]List.tsx` — Main Client Component
```typescript
"use client";
// antd imports + tRPC hooks here
// This receives initialData from the Server Component for hydration
```

## Step 3: Register Route
Confirm the folder exists at the correct path under `src/app/`.
For protected routes, ensure it's inside a route group with a session-checking layout.

## Step 4: Verify
```bash
npm run dev
# Navigate to the route and check for errors in terminal and browser console
```
