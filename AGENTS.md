# T3 Stack + Ant Design — Agent Instructions

## Stack Overview

This is a **full-stack TypeScript** application built with:

- **Next.js 15** (App Router, React 19, Turbopack)
- **tRPC v11** — end-to-end type-safe API (server components + client hooks)
- **Drizzle ORM** — type-safe SQL, schema-first, PostgreSQL
- **better-auth v1.3** — email/password + GitHub OAuth authentication
- **Ant Design 6** — enterprise UI component library
- **TypeScript** (strict mode, no `any`)

## Core Principles — Always Follow

1. **Type safety is non-negotiable.** Never use `any`, `as unknown`, or escape hatches. Propagate types end-to-end.
2. **Server-first rendering.** Server Components are the default. Add `"use client"` only when the component needs browser APIs, event handlers, or React state.
3. **Ant Design requires `"use client"`.** All antd components must be inside Client Components. Never render antd in a Server Component directly.
4. **tRPC v11 in Server Components** — call procedures directly via `await api.router.procedure()`. Use `useQuery`/`useMutation` hooks only in Client Components.
5. **No REST routes** — all data fetching goes through tRPC procedures, not Next.js route handlers (except for better-auth `/api/auth/[...all]` and file uploads).
6. **Drizzle over raw SQL** — always use the Drizzle query builder. Run migrations with `pnpm db:push` (dev) or `pnpm db:migrate` (prod). This project uses **pnpm** — never `npm`/`npx`.
7. **Zod everywhere** — validate all inputs at tRPC procedure boundaries with Zod schemas. Share schemas between client and server.

## Project Folder Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (AntdRegistry + providers)
│   ├── page.tsx                  # Homepage (Server Component)
│   ├── (auth)/                   # Auth route group
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/              # Protected route group
│   │   ├── layout.tsx            # Session guard layout
│   │   └── dashboard/page.tsx
│   └── api/
│       ├── auth/[...all]/route.ts  # better-auth handler
│       └── trpc/[trpc]/route.ts
├── components/                   # Shared UI components
│   ├── ui/                       # Primitive wrappers ("use client")
│   └── layout/                   # Layout components
├── server/
│   ├── better-auth/
│   │   ├── config.ts             # betterAuth() config
│   │   ├── index.ts              # re-exports auth
│   │   ├── server.ts             # getSession() server helper
│   │   └── client.ts             # authClient (createAuthClient)
│   ├── db/
│   │   ├── index.ts              # Drizzle client
│   │   └── schema.ts             # Database schema
│   └── api/
│       ├── trpc.ts               # tRPC init + context
│       ├── root.ts               # Root router (merges all routers)
│       └── routers/              # Individual tRPC routers (camelCase + `Router` suffix)
│           ├── courseRouter.ts   # e.g. courseRouter, enrollmentRouter, quizRouter
│           └── post.ts           # (legacy T3 scaffold router)
├── trpc/
│   ├── server.ts                 # Server-side tRPC caller
│   └── react.tsx                 # Client-side tRPC hooks provider
└── env.js                        # T3 env validation (t3-env-nextjs)
```

## Code Style

- Use `function` keyword for React components and tRPC routers (not arrow functions at top-level)
- Named exports everywhere — no `export default` except for Next.js special files (`page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`)
- `interface` over `type` for object shapes; `type` for unions and primitives
- Prefer `const` — never use `var`
- All async functions must handle errors. Wrap tRPC procedures in try/catch or use `.catch()`
- Use path aliases: `~/` maps to `src/`

## Naming Conventions

- **Files**: `kebab-case.tsx` for components, `camelCase.ts` for utilities/routers
- **Components**: `PascalCase`
- **tRPC routers**: `camelCase` files with a `Router` suffix (e.g., `courseRouter.ts`, `enrollmentRouter.ts`). Co-locate Zod input schemas at the top of the router file (no `src/lib/validators/` folder)
- **Drizzle tables**: `camelCase` exported symbols; app tables use the `createTable` factory (adds a `pg-drizzle_` prefix) with integer identity PKs; auth tables (`user`, `session`, `account`, `verification`) use `pgTable` with `text` PKs (managed by better-auth)
- **Env vars**: `SCREAMING_SNAKE_CASE`, always validated via `src/env.js`

## Security Rules

- Never expose server-only code to the client. Use `server-only` package for server modules.
- All tRPC mutations require authentication via `protectedProcedure`.
- Never trust client-provided IDs — always verify ownership in the procedure.
- Validate and sanitize all user input with Zod before database operations.
- Use `getSession()` from `~/server/better-auth/server` for session checks in Server Components.
