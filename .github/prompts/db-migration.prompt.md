---
description: "Plan and execute a safe Drizzle schema change: add columns, tables, or modify existing schema with proper migration strategy"
---

Plan and execute the schema change: **[CHANGE_DESCRIPTION]**

## Pre-flight Checklist

- [ ] Back up the database (or confirm this is development)
- [ ] Review current schema in `src/server/db/schema.ts`
- [ ] Identify all tRPC procedures that query affected tables
- [ ] Identify all TypeScript interfaces that need updating

## Schema Change Strategy

### Adding a new table

1. Define table in `schema.ts` with all columns, indexes, and foreign keys
2. Export `$inferSelect` and `$inferInsert` types
3. Run `pnpm db:generate` to create migration file
4. Review generated SQL in `drizzle/` directory
5. Run `pnpm db:push` in development

### Adding a column to existing table

- **Nullable new columns** (safe, non-breaking): Add with `.default(null)`
- **NOT NULL new columns** (breaking): Must provide `default` value or migrate data first
- **Never change a column type** in production without a multi-step migration

### Renaming a column (zero-downtime)

1. Add new column (nullable)
2. Deploy code that writes to both old + new columns
3. Backfill new column from old column data
4. Deploy code that reads from new column only
5. Remove old column

## Migration Commands

```bash
# Generate migration files from schema changes
pnpm db:generate

# Review the generated SQL
cat drizzle/[timestamp]_[name].sql

# Apply in development
pnpm db:push

# For production — run migration (not push)
pnpm db:migrate
```

## After Migration

- [ ] Update all affected tRPC routers to use new columns/tables
- [ ] Update the co-located Zod schemas in those routers
- [ ] Update TypeScript type exports from schema.ts
- [ ] Run `pnpm typecheck` to verify type safety
- [ ] Open Drizzle Studio to verify data: `pnpm db:studio`
