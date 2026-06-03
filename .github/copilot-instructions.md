# GitHub Copilot — T3 Stack + Ant Design Project

## Quick Reference

- **Framework**: Next.js 15 App Router + React 19
- **API**: tRPC v11 (type-safe, no REST)
- **DB**: Drizzle ORM + PostgreSQL
- **Auth**: better-auth v1.3
- **UI**: Ant Design 6
- **Language**: TypeScript strict mode

---

## tRPC Patterns

### Server Component (preferred)

```typescript
// src/app/posts/page.tsx — Server Component, no "use client"
import { api } from "~/trpc/server";

export default async function PostsPage() {
  const posts = await api.post.getAll();
  return <PostList posts={posts} />;  // PostList must be "use client" if it uses antd
}
```

### Client Component with hooks

```typescript
"use client";
import { api } from "~/trpc/react";

export function PostList() {
  const { data, isLoading } = api.post.getAll.useQuery();
  const utils = api.useUtils();
  const createPost = api.post.create.useMutation({
    onSuccess: () => utils.post.getAll.invalidate(),
  });
}
```

### tRPC Router

```typescript
// src/server/api/routers/post.ts
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { posts } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const postRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(posts).orderBy(posts.createdAt);
  }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(256), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db
        .insert(posts)
        .values({
          title: input.title,
          content: input.content,
          authorId: ctx.session.user.id,
        })
        .returning();
    }),
});
```

---

## Drizzle ORM Patterns

### Schema definition

```typescript
// src/server/db/schema.ts
import {
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";

// App tables: use createTable (applies "pg-drizzle_" prefix), integer PK
export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("created_by_idx").on(t.createdById)],
);

// Auth tables: use pgTable directly (no prefix), text PK — managed by better-auth
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Always export type inference helpers
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type User = typeof user.$inferSelect;
```

### Query patterns

```typescript
// Select with join
const postsWithAuthors = await db
  .select({ post: posts, author: users })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.authorId, userId))
  .orderBy(desc(posts.createdAt));

// Insert and return
const [newPost] = await db.insert(posts).values(data).returning();

// Update
await db.update(posts).set({ title: newTitle }).where(eq(posts.id, id));

// Delete
await db.delete(posts).where(eq(posts.id, id));
```

---

## better-auth v1.3 Patterns

### Server Component session check

```typescript
import { getSession } from "~/server/better-auth/server";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return <div>Hello {session.user.name}</div>;
}
```

### Protected tRPC procedure

```typescript
// protectedProcedure is already defined in trpc.ts
// Use it for any mutation or query requiring auth:
export const myRouter = createTRPCRouter({
  sensitiveData: protectedProcedure.query(({ ctx }) => {
    // ctx.session.user is always defined here; user.id is a string
    return getData(ctx.session.user.id);
  }),
});
```

### Client Component session + sign-out

```typescript
"use client";
import { authClient } from "~/server/better-auth/client";
import { Button } from "antd";
import { useRouter } from "next/navigation";

export function UserNav() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  if (!session) return <Button onClick={() => router.push("/login")}>Sign In</Button>;
  return (
    <Button
      onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
    >
      Sign Out ({session.user.name})
    </Button>
  );
}
```

---

## Ant Design + Next.js App Router Rules

### ⚠️ Critical Rules

1. All antd components require `"use client"` — never use in Server Components
2. Never use dot notation: use `import { Option } from "antd/es/select"` not `<Select.Option />`
3. Always wrap the app with `AntdRegistry` in root layout for SSR style injection

### Root layout setup

```typescript
// src/app/layout.tsx
import { AntdRegistry } from "@ant-design/nextjs-registry";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ConfigProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
```

### Client Component with antd

```typescript
"use client";
import { Button, Form, Input, message } from "antd";
import type { FormProps } from "antd";

interface FormValues {
  title: string;
  content: string;
}

export function PostForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  return (
    <>
      {contextHolder}
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="content" label="Content" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Submit</Button>
        </Form.Item>
      </Form>
    </>
  );
}
```

---

## Environment Variables

Always add new env vars to `src/env.js` — never read `process.env` directly in application code:

```typescript
// src/env.js — add new vars here, not inline
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_GITHUB_CLIENT_ID: z.string().min(1),
    BETTER_AUTH_GITHUB_CLIENT_SECRET: z.string().min(1),
    // add new server vars here
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
    // add new public vars here
  },
  runtimeEnv: { ... },
});
```

## Testing

- Use **Vitest** for unit tests
- Use **Playwright** for E2E tests
- Test files: `*.test.ts` alongside the source file or in `__tests__/`
- Mock tRPC in tests using `createCallerFactory` from tRPC
