---
name: drizzle-schema
description: "Add or modify Drizzle ORM database schema. Use when asked to add a new table, column, index, relationship, or migration. Handles the full schema change lifecycle including migration generation."
---

# Drizzle Schema Skill

You will safely add or modify database schema in this PostgreSQL + Drizzle ORM project.

## Step 1: Read Current Schema

Read `src/server/db/schema.ts` completely to understand existing tables, relationships, and conventions.

## Step 2: Design the Change

Apply these rules:

### Two Table Patterns — Never Mix

1. **App tables** (your domain data): use `createTable` (adds `pg-drizzle_` prefix to DB table name)
   - PK: `d.integer().primaryKey().generatedByDefaultAsIdentity()`
   - Timestamps: `createdAt` and `updatedAt` on every table
   - Foreign key to user: `.references(() => user.id)` (user.id is `text`)

2. **Auth tables** (`user`, `session`, `account`, `verification`): use bare `pgTable`, text PK
   - These are **owned by better-auth** — do NOT add columns or modify them
   - Only reference them via FK; never alter their structure

### Schema Rules

- **Enums**: use `pgEnum` for finite value sets (never store as plain text)
- **Foreign keys**: always specify `onDelete` behavior (`"cascade"`, `"set null"`, `"restrict"`)
- **Indexes**: add for every FK column, slug, status, email, and any column used in WHERE clauses
- **Nullable columns**: new columns in existing tables MUST be nullable or have a default value

## Step 3: Write the Schema Change

Add to `src/server/db/schema.ts`:

```typescript
// Enum (if needed)
export const statusEnum = pgEnum("status", ["active", "inactive"]);

// App table
export const [tableName] = createTable(
  "[table_name]",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    // FK to better-auth user (text PK):
    userId: d.varchar({ length: 255 }).notNull().references(() => user.id, { onDelete: "cascade" }),
    // ... other columns
    createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("[table]_user_id_idx").on(t.userId),
    // add more indexes as needed
  ],
);

// Type exports (always)
export type [TableName] = typeof [tableName].$inferSelect;
export type New[TableName] = typeof [tableName].$inferInsert;
```

## Step 4: Generate and Review Migration

```bash
pnpm run db:generate
```

Read the generated SQL file in `drizzle/` and verify it matches intent. Check for unintended drops.

## Step 5: Apply in Development

```bash
pnpm run db:push
```

## Step 6: Update Dependent Code

Search for all files that query the modified table and update:

- tRPC routers using the table (update Zod schemas and queries)
- TypeScript interfaces (replace with new `$inferSelect` type)
- Any hardcoded column references

## Step 7: Verify

```bash
npx tsc --noEmit
pnpm run lint
```

You will safely add or modify database schema in this PostgreSQL + Drizzle ORM project.

## Step 1: Read Current Schema

Read `src/server/db/schema.ts` completely to understand existing tables, relationships, and conventions.

## Step 2: Design the Change

Apply these rules:

- **Primary keys**: `uuid("id").default(sql\`gen_random_uuid()\`).primaryKey()`
- **Timestamps**: Every table has `createdAt` and `updatedAt`
- **Enums**: Use `pgEnum` for finite sets of values
- **Foreign keys**: Always specify `onDelete` behavior (`"cascade"`, `"set null"`, `"restrict"`)
- **Indexes**: Add for every FK column, slug, status, email
- **Nullable columns**: New columns in existing tables MUST be nullable (or have a default)

## Step 3: Write the Schema Change

Add to `src/server/db/schema.ts`:

```typescript
// Enum (if needed)
export const statusEnum = pgEnum("status", ["active", "inactive"]);

// Table
export const [tableName] = pgTable(
  "[table_name]",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    // ... columns
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    // indexes
    [fkColumn]Idx: index("[table]_[fk]_idx").on(table.[fkColumn]),
  })
);

// Type exports (always)
export type [TableName] = typeof [tableName].$inferSelect;
export type New[TableName] = typeof [tableName].$inferInsert;
```

## Step 4: Generate and Review Migration

```bash
npm run db:generate
```

Read the generated SQL file in `drizzle/` and verify it matches intent.

## Step 5: Apply in Development

```bash
npm run db:push
```

## Step 6: Update Dependent Code

Search for all files that query the modified table and update:

- tRPC routers using the table
- TypeScript interfaces (replace with new `$inferSelect` type)
- Zod schemas matching new columns

## Step 7: Verify

```bash
npx tsc --noEmit
npm run lint
```
