---
trigger: always_on
---

# T3 Stack + Ant Design — Windsurf Rules

The canonical project rules live in `AGENTS.md` at the repo root. Always follow it.
This file is the Windsurf-native mirror of the non-negotiables.

## Non-negotiables

- **Package manager is `pnpm`** — never `npm`/`npx`. Verify with `pnpm typecheck`, `pnpm lint`, `pnpm build`.
- **No `any`** and no unsafe casts. Propagate types end-to-end (Drizzle → tRPC → React).
- **Server Components by default.** Add `"use client"` only for hooks, events, browser APIs, or antd components.
- **Ant Design only inside Client Components.** Use `App.useApp()` for `message`/`notification`/`modal`; never the static methods.
- **All data flows through tRPC** (no REST route handlers except better-auth `/api/auth/[...all]` and file uploads).
- **Drizzle only** — no raw SQL. App tables use the `createTable` factory (`pg-drizzle_` prefix) with integer identity PKs; auth tables (`user`, `session`, `account`, `verification`) are managed by better-auth with `text` PKs.
- **Auth is better-auth** (email/password + GitHub OAuth). Use `getSession()` from `~/server/better-auth/server` in Server Components and `authClient` from `~/server/better-auth/client` in Client Components.
- **Zod at every tRPC boundary**, co-located at the top of each `xxxRouter.ts` file. There is no `src/lib/validators/` folder.

## Migrations

After editing `src/server/db/schema.ts`, run `pnpm db:generate && pnpm db:push` (dev) or `pnpm db:migrate` (prod).

## Tests

No test runner is installed yet (no `test` script). Do not run `pnpm test` until Vitest/Playwright are added — see `.github/instructions/tests.instructions.md`.
