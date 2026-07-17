---
description: "Starting spec for any non-trivial new feature. Use this structure to ensure the agent gets stack context, scope, acceptance, and autonomy right."
---

Implement: **[FEATURE_NAME]**

## 1. Goal

One-sentence, measurable outcome this feature should produce.

## 2. Context

- **Stack:** Next.js 15 App Router, React 19, tRPC v11, Drizzle ORM, better-auth v1.3, Ant Design 6, TypeScript strict mode.
- **Relevant files / routes:** [list existing files to read first]
- **Pattern to mirror:** [path to a similar existing component/page/router]
- **User role(s) impacted:** [student | teacher | admin | all]
- **Related issue / design doc:** [link if any]

## 3. Scope & Constraints

### In scope
- [ ]

### Out of scope
- [ ]

### Technical constraints
- Server Components are the default; add `"use client"` only for browser APIs, event handlers, or React state.
- All Ant Design components must be inside Client Components.
- All data fetching goes through tRPC procedures (no new Next.js route handlers except auth / file uploads).
- Use Drizzle query builder; no raw SQL. Run `pnpm db:generate` and `pnpm db:push` for schema changes.
- Validate all tRPC inputs with Zod; co-locate schemas in the router file.
- Use `function` keyword for routers/components; named exports only (no `export default` except Next.js special files).
- No `any` types; propagate types end-to-end.
- Do not add new dependencies without explicit approval.
- Do not modify unrelated files.

## 4. Acceptance Criteria

- [ ] Feature works as described in the Goal.
- [ ] `pnpm check` passes.
- [ ] `pnpm build` passes.
- [ ] [specific test, UI check, or edge case]

## 5. Hand-off / Autonomy

- **Plan first** if this touches more than one file or route. List the files you intend to change, the tests you will add, and any new env vars or migrations. Wait for approval before writing code unless the task is trivial.
- Use `todo_list` to track sub-tasks and mark them completed as you go.
- Keep the user updated after each major step (plan, implementation, verification).
