# Harness Verification Plan — Session 704b05

## Verification Results (all APIs confirmed against official docs)

| Item | Status | Evidence |
|---|---|---|
| `getSessionCookie` from `better-auth/cookies` | ✅ Correct | Official better-auth Next.js integration docs; synchronous call |
| `trigger: always_on` in `.windsurf/rules/` frontmatter | ✅ Correct | docs.windsurf.com/windsurf/cascade/memories |
| `.windsurf/rules/` location | ✅ Valid | Confirmed as fallback (preferred: `.devin/rules/`); both work in Windsurf IDE |
| `// turbo` annotation in workflows | ✅ Correct | Cascade-native convention per system rules |
| `{env:OPENWEBUI_API_KEY}` in opencode.json | ✅ Correct | opencode.ai/docs/config — confirmed `{env:VAR}` syntax |
| `App.useApp()` for message/notification/modal | ✅ Correct | antd API docs (`const { message, notification, modal } = App.useApp()`) |
| `Space orientation` prop (not `direction`) | ✅ Correct | antd Space API: `orientation (vertical \| horizontal)` |
| `pnpm typecheck` script | ✅ Correct | package.json has `"typecheck": "tsc --noEmit"` |
| `getSession()` using `auth.api.getSession()` | ✅ Correct | server.ts uses `auth.api.getSession({ headers: await headers() })` |

---

## Remaining Fixes Required (exit Plan Mode to apply)

### V1 — `pnpm run X` → `pnpm X` (4 files, consistency with AGENTS.md standard)

**File: `.github/skills/drizzle-schema/SKILL.md`**
- Line 69: `pnpm run db:generate` → `pnpm db:generate`
- Line 77: `pnpm run db:push` → `pnpm db:push`

**File: `.github/instructions/drizzle.instructions.md`**
- Line 170: `pnpm run db:generate` → `pnpm db:generate`
- Line 173: `pnpm run db:push` → `pnpm db:push`
- Line 176: `pnpm run db:studio` → `pnpm db:studio`

**File: `.github/hooks/lint-on-complete.json`**
- Line 6: `pnpm run lint` → `pnpm lint`
- Line 7 (windows): `pnpm run lint` → `pnpm lint`

**File: `.github/hooks/schema-change-warning.json`**
- Line 6 (bash command string): `pnpm run db:generate && pnpm run db:push` → `pnpm db:generate && pnpm db:push`
- Line 7 (windows command string): same replacement

### V2 — Type fix in `antd-component/SKILL.md`

**File: `.github/skills/antd-component/SKILL.md`**
- Line 91: `const handleDelete = (id: string)` → `(id: number)`
  (App tables use integer identity PKs; the `[Feature].$inferSelect` type has `id: number`)

### V3 — Missing imports + type fix in `antd.instructions.md`

**File: `.github/instructions/antd.instructions.md`**
- LoginForm example (line 48): Add `import { MailOutlined } from "@ant-design/icons"` (used at line 77; currently not imported)
- Table example (line 95): Add `import { useState } from "react"` (used at line 106; currently missing)
- `DataItem` interface (line 100): `id: string` → `id: number` (integer PKs)

---

## Files verified as correct (no changes needed)

- `.opencode/opencode.json` — `{env:OPENWEBUI_API_KEY}` correct; `npx` in MCP command is acceptable (system-level MCP invocation, not a project script)
- `.windsurf/rules/stack.md` — frontmatter and content correct
- `.windsurf/workflows/add-trpc-feature.md` — `// turbo` annotations correct
- `.github/instructions/auth.instructions.md` — `getSessionCookie` import/usage correct; stale NextAuth halves removed
- `.github/instructions/nextjs.instructions.md` — better-auth middleware pattern correct
- `.github/copilot-instructions.md` — `createdById`, `user` table, `App.useApp()` all correct
- `.github/skills/auth-patterns/SKILL.md` — stale Auth.js half removed; better-auth patterns correct
- `.github/agents/*.agent.md` — pnpm, co-located Zod, integer PKs all consistent
- `.vscode/mcp.json` — MongoDB removed; remaining servers correct
