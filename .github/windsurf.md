# Windsurf AI Configuration

This repository is configured for optimal use with the **Windsurf AI Code Editor** (formerly Codeium / Devin).

## Available Agents

Located in `.github/agents/`:

| Agent           | Purpose                         | Use When                          |
| --------------- | ------------------------------- | --------------------------------- |
| `@t3-developer` | Full-stack T3 Stack development | General implementation tasks      |
| `@db-architect` | Database schema design          | Creating/modifying tables         |
| `@planner`      | Architecture planning           | Complex features requiring design |
| `@implementer`  | Focused implementation          | Well-defined, scoped tasks        |
| `@reviewer`     | Code review                     | Reviewing PRs or changes          |

## Available Skills

Located in `.github/skills/`:

- `antd-component/` - Ant Design component patterns
- `auth-patterns/` - Authentication flow patterns
- `drizzle-schema/` - Database schema patterns
- `nextjs-patterns/` - Next.js App Router patterns
- `trpc-router/` - tRPC router and procedure patterns

## Prompts

Located in `.github/prompts/`:

- `add-antd-form.prompt.md` - Add Ant Design forms
- `add-auth-flow.prompt.md` - Add authentication flows
- `add-page.prompt.md` - Add new Next.js pages
- `add-trpc-router.prompt.md` - Add tRPC routers
- `code-review.prompt.md` - AI code review template
- `db-migration.prompt.md` - Database migration tasks

## Instructions

Located in `.github/instructions/`:

- `antd.instructions.md` - Ant Design usage guidelines
- `auth.instructions.md` - Authentication patterns
- `drizzle.instructions.md` - ORM patterns
- `nextjs.instructions.md` - Next.js conventions
- `tests.instructions.md` - Testing guidelines
- `trpc.instructions.md` - tRPC patterns

## Windsurf Hooks

Located in `.github/hooks/` - These run automatically:

- `format-on-write.json` - Formats code on file save
- `lint-on-complete.json` - Runs linter after AI completion
- `schema-change-warning.json` - Warns on schema changes
- `typecheck-on-complete.json` - Type checks after completion

## Quick Commands

```bash
# Activate an agent
@t3-developer implement a user profile page with Ant Design

# Use a prompt
/add-page path=/dashboard/courses title="Course Management"

# Apply a skill
@skill apply drizzle-schema create enrollment table

# Verify (this project uses pnpm)
pnpm typecheck && pnpm lint && pnpm build
```

## Best Practices

1. **Always verify type safety**: Run `pnpm typecheck` after AI changes (this project uses **pnpm**, never npm/npx)
2. **Review AI-generated code**: Use `@reviewer` agent for quality checks
3. **Follow the stack**: tRPC → Drizzle → Next.js → Ant Design
4. **Server-first**: Default to Server Components, add `"use client"` only when needed
5. **No `any` types**: Always use proper TypeScript types

## CI/CD Integration

GitHub Actions workflows (`.github/workflows/`):

- `ci.yml` - Lint, typecheck, and build on every PR
- `pr-review.yml` - PR validation and AI review hints

## Related Files

- `copilot-instructions.md` - GitHub Copilot instructions (similar to Windsurf config)
- `AGENTS.md` (root) - **Single source of truth** for stack rules; all tools (Copilot, Windsurf, OpenCode) reference it
- `.windsurf/rules/` + `.windsurf/workflows/` - Windsurf-native rule and workflow layer that points back to `AGENTS.md`
