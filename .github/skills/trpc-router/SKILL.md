---
name: trpc-router
description: "Scaffold a complete, production-ready tRPC v11 router with Drizzle queries, Zod validation, auth guards, error handling, and root registration. Use when asked to add a new API feature, endpoint, or data entity."
---

# tRPC Router Scaffolding Skill

You will create a complete tRPC router for this T3 Stack project.

## Discovery Phase

First, read these files to understand the existing patterns:

- `src/server/api/trpc.ts` — available procedures and context shape
- `src/server/api/root.ts` — existing router registrations
- `src/server/db/schema.ts` — available DB tables and types
- One existing router in `src/server/api/routers/` as a style reference

## Zod Validators (co-located at the top of the router file)

This project does **not** use a `src/lib/validators/` folder. Define Zod input schemas at the top of the router file itself (see `src/server/api/routers/courseRouter.ts`). App-table IDs are **integers**, not UUIDs.

```typescript
import { z } from "zod";

const create[Feature]Schema = z.object({
  // field: z.string().min(1).max(256),
});

const update[Feature]Schema = create[Feature]Schema.partial().extend({
  id: z.number().int(),
});

const [feature]FilterSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
```

## Router (`src/server/api/routers/[feature]Router.ts`)

The router MUST include:

- `getAll` with pagination (protectedProcedure or publicProcedure based on feature)
- `getById` with NOT_FOUND error handling
- `create` with protectedProcedure
- `update` with ownership check
- `delete` with ownership check

Every mutation:

- Uses `protectedProcedure` (or `adminProcedure`/`teacherProcedure` where appropriate)
- Checks ownership: `.where(and(eq(table.id, input.id), eq(table.createdById, ctx.session.user.id)))`
- Handles the case where record is not found after update/delete
- Returns the created/updated record via `.returning()`

## Register in Root (`src/server/api/root.ts`)

Add import and register in `appRouter`.

## Verification

Run: `pnpm typecheck` and confirm 0 errors.
