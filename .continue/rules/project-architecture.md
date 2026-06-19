---
name: eLearning — Project Architecture
---

# Project: eLearning Portal

## Repository Path
`/Users/markwinap/repos/trinity-elearning-portal`

## Stack (non-negotiable — see AGENTS.md for full details)
- **Next.js 15** — App Router, React 19, Turbopack
- **tRPC v11** — ALL data fetching. No REST routes except `/api/auth/[...all]` and file uploads.
- **Drizzle ORM** — PostgreSQL, schema-first, never raw SQL. Dev: `npm run db:push`. Prod: `drizzle-kit migrate`.
- **better-auth v1.3** — email/password + GitHub OAuth
- **Ant Design 6** — enterprise UI, always in Client Components
- **TypeScript strict** — never `any`, never `as unknown`

## File Structure Map (key paths for agent navigation)

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (AntdRegistry + providers)
│   ├── page.tsx                  # Homepage (Server Component)
│   ├── (auth)/login/page.tsx     # Login page
│   ├── (auth)/register/page.tsx  # Register page
│   ├── (dashboard)/layout.tsx    # Session guard layout
│   ├── (dashboard)/dashboard/page.tsx
│   └── api/
│       ├── auth/[...all]/route.ts   # better-auth handler (DO NOT MODIFY)
│       └── trpc/[trpc]/route.ts     # tRPC HTTP handler
├── components/
│   ├── ui/                       # Ant Design wrappers ("use client" required)
│   └── layout/                   # Shared layout components
├── server/
│   ├── better-auth/
│   │   ├── config.ts             # betterAuth() config
│   │   ├── index.ts              # re-exports auth
│   │   ├── server.ts             # getSession() — use in Server Components
│   │   └── client.ts             # authClient — use in Client Components
│   ├── db/
│   │   ├── index.ts              # Drizzle client export
│   │   └── schema.ts             # ALL table definitions live here
│   └── api/
│       ├── trpc.ts               # tRPC init + context factory
│       ├── root.ts               # Root router (merges all routers)
│       └── routers/
│           ├── user.ts           # userRouter
│           └── post.ts           # postRouter
├── trpc/
│   ├── server.ts                 # Server-side tRPC caller: `const api = await createCaller()`
│   └── react.tsx                 # Client-side: TRPCReactProvider + hooks
└── env.js                        # T3 env validation (t3-env-nextjs) — add all new env vars here
```

## Critical Rendering Rules

1. Server Components are the default. Only add `"use client"` when necessary.
2. Ant Design = Client Component. If a component uses antd, it needs `"use client"`.
3. Server Component data: `const data = await api.router.procedure()` (direct caller)
4. Client Component data: `const { data } = api.router.procedure.useQuery()`
5. Never import server-only code into client components. Use `import 'server-only'` to guard.

## tRPC Procedure Pattern

```typescript
// PROTECTED mutation (most common for write operations)
export const postRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // ctx.session.user is guaranteed non-null in protectedProcedure
      // ALWAYS verify ownership before DB operations
      return ctx.db.insert(posts).values({
        title: input.title,
        userId: ctx.session.user.id,
      });
    }),
});
```

## Drizzle Schema Pattern

```typescript
// In src/server/db/schema.ts
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## Naming Conventions
- Files: `kebab-case.tsx` (components), `camelCase.ts` (utilities/routers)
- Components: `PascalCase`
- tRPC routers: `camelCase` (`userRouter`, `postRouter`)
- Drizzle tables: `camelCase` in TS → `snake_case` in DB
- Env vars: `SCREAMING_SNAKE_CASE`, always validated in `src/env.js`
- No `export default` except Next.js special files (`page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`)

## Security Rules (always enforce)
- `protectedProcedure` for all mutations
- Never trust client-provided IDs — verify ownership in the procedure
- Zod validation on all tRPC inputs before any DB operation
- `getSession()` from `~/server/better-auth/server` for Server Component session checks
