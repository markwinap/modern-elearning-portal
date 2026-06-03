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

## File 1: Zod Validators (`src/lib/validators/[feature].ts`)
```typescript
import { z } from "zod";

export const create[Feature]Schema = z.object({
  // field: z.string().min(1).max(256),
});

export const update[Feature]Schema = create[Feature]Schema.partial().extend({
  id: z.string().uuid(),
});

export const [feature]FilterSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type Create[Feature]Input = z.infer<typeof create[Feature]Schema>;
export type Update[Feature]Input = z.infer<typeof update[Feature]Schema>;
```

## File 2: Router (`src/server/api/routers/[feature].ts`)
The router MUST include:
- `getAll` with pagination (protectedProcedure or publicProcedure based on feature)
- `getById` with NOT_FOUND error handling
- `create` with protectedProcedure
- `update` with ownership check
- `delete` with ownership check

Every mutation:
- Uses `protectedProcedure`
- Checks ownership: `.where(and(eq(table.id, input.id), eq(table.authorId, ctx.session.user.id)))`
- Handles the case where record is not found after update/delete
- Returns the created/updated record via `.returning()`

## File 3: Register in Root (`src/server/api/root.ts`)
Add import and register in `appRouter`.

## Verification
Run: `npx tsc --noEmit` and confirm 0 errors.
