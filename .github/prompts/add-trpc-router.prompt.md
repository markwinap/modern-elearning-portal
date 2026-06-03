---
description: "Scaffold a complete tRPC router with CRUD operations, Drizzle schema, Zod validators, and register it in root.ts"
---

Create a complete tRPC feature module for: **[FEATURE_NAME]**

Follow these steps in order:

## Step 1 — Drizzle Schema
Add the table definition to `src/server/db/schema.ts`:
- UUID primary key with `gen_random_uuid()`
- Appropriate columns with correct pg types and constraints
- `createdAt` and `updatedAt` timestamps
- Foreign keys with `onDelete: "cascade"` where appropriate
- Indexes on frequently queried columns (foreign keys, status, slug)
- Export `$inferSelect` and `$inferInsert` types

## Step 2 — Zod Validators
Create `src/lib/validators/[feature].ts` with:
- `create[Feature]Schema` — input validation for create mutations
- `update[Feature]Schema` — partial of create schema + id
- `[feature]FilterSchema` — for list/search queries with pagination
- Export all `z.infer<>` types

## Step 3 — tRPC Router
Create `src/server/api/routers/[feature].ts` with:
- `getAll` — publicProcedure or protectedProcedure, returns paginated list
- `getById` — publicProcedure with UUID input, throws NOT_FOUND if missing
- `create` — protectedProcedure, validates with Zod, returns created record
- `update` — protectedProcedure, verifies ownership, partial update
- `delete` — protectedProcedure, verifies ownership before deleting

## Step 4 — Register Router
Add to `src/server/api/root.ts`:
```typescript
import { [feature]Router } from "./routers/[feature]";
// Add to appRouter:
[feature]: [feature]Router,
```

## Step 5 — Generate Migration
Run `npm run db:generate` and confirm the migration SQL looks correct.

## Step 6 — Verify Types
Confirm TypeScript compilation: `npx tsc --noEmit`
