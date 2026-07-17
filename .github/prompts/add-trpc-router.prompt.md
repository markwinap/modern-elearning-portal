---
description: "Scaffold a complete tRPC router with CRUD operations, Drizzle schema, Zod validators, and register it in root.ts"
---

Create a complete tRPC feature module for: **[FEATURE_NAME]**

Follow these steps in order:

## Step 1 — Drizzle Schema

Add the table definition to `src/server/db/schema.ts` using the `createTable` factory (applies the `pg-drizzle_` prefix):

- Integer identity primary key: `d.integer().primaryKey().generatedByDefaultAsIdentity()`
- Appropriate columns with correct pg types and constraints
- `createdAt` and `updatedAt` timestamps
- Foreign keys with `onDelete: "cascade"` where appropriate (FKs to `user` are `varchar`/`text`)
- Indexes on frequently queried columns (foreign keys, status, slug)
- Export `$inferSelect` and `$inferInsert` types

## Step 2 — Zod Input Schemas (co-located)

Define Zod schemas at the **top of the router file** (this project has no `src/lib/validators/` folder):

- `create[Feature]Schema` — input validation for create mutations
- `update[Feature]Schema` — partial of create schema + `id: z.number().int()`
- `[feature]FilterSchema` — for list/search queries with pagination

## Step 3 — tRPC Router

Create `src/server/api/routers/[feature]Router.ts` with:

- `getAll` — publicProcedure or protectedProcedure, returns paginated list
- `getById` — publicProcedure with `z.number().int()` input, throws NOT_FOUND if missing
- `create` — protectedProcedure, validates with Zod, returns created record
- `update` — protectedProcedure, verifies ownership, partial update
- `delete` — protectedProcedure, verifies ownership before deleting

## Step 4 — Register Router

Add to `src/server/api/root.ts`:

```typescript
import { [feature]Router } from "./routers/[feature]Router";
// Add to appRouter:
[feature]: [feature]Router,
```

## Step 5 — Generate Migration

Run `pnpm db:generate && pnpm db:push` and confirm the migration SQL looks correct.

## Step 6 — Verify Types

Confirm TypeScript compilation: `pnpm typecheck`
