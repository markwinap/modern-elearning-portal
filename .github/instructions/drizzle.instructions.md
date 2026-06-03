---
applyTo: "src/server/db/**/*.ts,drizzle.config.ts"
---

# Drizzle ORM Rules

## Schema Design Principles

- Define all tables in `src/server/db/schema.ts`
- Use PostgreSQL types — never SQLite types
- Always add `createdAt` and `updatedAt` timestamps to app tables
- **Two table patterns — never mix them:**
  1. **App tables** (`posts`, etc.): use `createTable` (applies `pg-drizzle_` prefix) with **integer PK** via `generatedByDefaultAsIdentity()`
  2. **Auth tables** (`user`, `session`, `account`, `verification`): use bare `pgTable` (no prefix) with **text PK** — these are owned by better-auth, do not modify
- Export `$inferSelect` and `$inferInsert` types for every app table

```typescript
// src/server/db/schema.ts
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

// ── App table factory (prefix: pg-drizzle_) ──
export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

// Enums — use pgEnum for finite value sets
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "published",
  "archived",
]);

// App table example
export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    title: d.varchar({ length: 256 }).notNull(),
    status: postStatusEnum("status").default("draft").notNull(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => user.id), // references better-auth user.id (text)
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("post_created_by_idx").on(t.createdById),
    index("post_status_idx").on(t.status),
  ],
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;

// ── Auth tables (managed by better-auth — READ ONLY) ──
// These use bare pgTable (no prefix) and text PKs.
// Do NOT add columns or modify these tables manually.
export const user = pgTable("user", {
  id: text("id").primaryKey(), // string, not integer
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export type User = typeof user.$inferSelect;
```

## Query Patterns

### Basic CRUD

```typescript
import { db } from "~/server/db";
import { posts, users } from "~/server/db/schema";
import { eq, desc, and, like, gte, count } from "drizzle-orm";

// SELECT
const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));

// SELECT with WHERE
const userPosts = await db
  .select()
  .from(posts)
  .where(eq(posts.authorId, userId));

// SELECT specific columns
const postTitles = await db
  .select({ id: posts.id, title: posts.title })
  .from(posts);

// JOIN
const postsWithAuthors = await db
  .select({ post: posts, author: users })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.status, "published"))
  .orderBy(desc(posts.createdAt))
  .limit(20);

// INSERT returning
const [created] = await db.insert(posts).values(newPost).returning();

// UPDATE
const [updated] = await db
  .update(posts)
  .set({ title: newTitle, updatedAt: new Date() })
  .where(and(eq(posts.id, postId), eq(posts.authorId, userId)))
  .returning();

// DELETE
await db.delete(posts).where(eq(posts.id, postId));

// COUNT
const [{ total }] = await db.select({ total: count() }).from(posts);
```

### Pagination

```typescript
async function getPaginatedPosts(page: number, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(posts)
      .limit(pageSize)
      .offset(offset)
      .orderBy(desc(posts.createdAt)),
    db.select({ total: count() }).from(posts),
  ]);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
```

### Transactions

```typescript
const result = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning();
  await tx.insert(profiles).values({ userId: user.id, ...profileData });
  return user;
});
```

## Migration Commands

```bash
# Generate migration from schema changes
pnpm run db:generate

# Apply migrations in development (push schema directly)
pnpm run db:push

# Open Drizzle Studio
pnpm run db:studio
```

## Drizzle Config

```typescript
// drizzle.config.ts
import { type Config } from "drizzle-kit";
import { env } from "~/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL },
  out: "./drizzle",
  verbose: true,
  strict: true,
} satisfies Config;
```
