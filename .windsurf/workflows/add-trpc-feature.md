---
description: Scaffold a new end-to-end tRPC feature (schema -> router -> page) following project conventions
---

Follow `AGENTS.md` and `.windsurf/rules/stack.md` throughout.

1. Read existing patterns: `src/server/api/trpc.ts` (available procedures), `src/server/api/root.ts`, `src/server/db/schema.ts`, and one existing `*Router.ts` (e.g. `courseRouter.ts`).
2. Add the table to `src/server/db/schema.ts` with the `createTable` factory and an integer identity PK (`d.integer().primaryKey().generatedByDefaultAsIdentity()`). FKs to `user` are `varchar`/`text`. Export `$inferSelect`/`$inferInsert` types.
// turbo
3. Generate and apply the migration: `pnpm db:generate && pnpm db:push`.
4. Create `src/server/api/routers/[feature]Router.ts` with Zod input schemas co-located at the top of the file. Mutations use `protectedProcedure` (or `adminProcedure`/`teacherProcedure`) and verify ownership.
5. Register the router in `src/server/api/root.ts`.
6. Add the Server Component page under `src/app/.../page.tsx` (fetch via `await api.[feature].*`), plus `loading.tsx` and `error.tsx`. Put antd UI in Client Components under `_components/`.
// turbo
7. Verify: `pnpm typecheck && pnpm lint && pnpm build`.
