---
applyTo: "src/app/**/*.tsx,src/app/**/*.ts"
---

# Next.js App Router Rules

## Server vs Client Components

**Default to Server Components.** Only add `"use client"` when the component:

- Uses React hooks (`useState`, `useEffect`, `useRef`, etc.)
- Handles browser events (`onClick`, `onChange`, etc.)
- Uses browser APIs (`window`, `localStorage`, `navigator`)
- Renders antd components directly
- Uses tRPC client hooks

```typescript
// ✅ Server Component (no directive needed)
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await api.product.getById({ id: params.id });
  return (
    <main>
      <h1>{product.name}</h1>
      <ProductActions product={product} /> {/* Client Component */}
    </main>
  );
}

// ✅ Client Component
"use client";
export function ProductActions({ product }: { product: Product }) {
  const deleteProduct = api.product.delete.useMutation();
  return <Button onClick={() => deleteProduct.mutate({ id: product.id })}>Delete</Button>;
}
```

## File Conventions

- `page.tsx` — route page (can be async Server Component)
- `layout.tsx` — shared layout wrapper (can be async Server Component)
- `loading.tsx` — Suspense fallback UI
- `error.tsx` — error boundary (`"use client"` required)
- `not-found.tsx` — 404 page
- `route.ts` — API route handler (for auth callbacks and file uploads only)

## Data Fetching in Server Components

```typescript
// ✅ Fetch data at the top of the page component
export default async function DashboardPage() {
  // Parallel fetching — don't await sequentially if independent
  const [users, stats] = await Promise.all([
    api.user.getAll(),
    api.analytics.getStats(),
  ]);
  return <Dashboard users={users} stats={stats} />;
}
```

## Metadata

Always export `metadata` or `generateMetadata` from page files:

```typescript
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Title",
  description: "Page description",
};

// Or dynamic:
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await api.post.getById({ id: params.id });
  return { title: post.title };
}
```

## Route Groups and Layouts

```
app/
├── (auth)/          # Auth routes — no shared layout with dashboard
│   └── login/
├── (dashboard)/     # Protected routes — share DashboardLayout
│   ├── layout.tsx   # <-- session guard here
│   ├── home/
│   └── settings/
└── layout.tsx       # Root layout (AntdRegistry, providers)
```

## Parallel and Intercepting Routes

- Use `@slot` for parallel routes (modals, side panels)
- Use `(.)route` for intercepting routes (modal on navigate, full page on refresh)

## Dynamic Routes

```typescript
// src/app/posts/[id]/page.tsx
export async function generateStaticParams() {
  const posts = await api.post.getAll();
  return posts.map((post) => ({ id: post.id }));
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const post = await api.post.getById({ id: params.id });
  if (!post) notFound();
  return <PostDetail post={post} />;
}
```

## Middleware

This project uses **better-auth** (not Auth.js). Use `getSessionCookie` for an optimistic
redirect; always re-validate with `getSession()` in the page/layout. See
`instructions/auth.instructions.md` for the full pattern.

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
