# OpenCode Workflow Rules — Trinity E-Learning Portal

> This file extends the root `AGENTS.md`. Both are loaded automatically by OpenCode.
> Root `AGENTS.md` defines stack rules. This file defines agent workflow rules.

## Agent Roles

| Agent | Model | Use When |
|-------|-------|----------|
| `coder` (default) | Qwen2.5-Coder 14B | All coding tasks — edits, tests, refactors |
| `@reasoner` | DeepSeek-R1 14B | Architecture decisions, complex problem decomposition |
| `@reviewer` | Qwen3 14B | Code review after features or significant changes |

## Workflow Protocol

### Before Starting a Feature
1. If the feature touches the DB schema, auth flow, or a new tRPC router — invoke `@reasoner` first.
2. Document the architectural decision in `memories/session/` if it is non-trivial.

### During Implementation (`coder` agent)
- Work in small, verifiable steps. Run `pnpm build` or `pnpm typecheck` after each logical unit.
- Never guess at a type — read the source or use `grep`/`list` tools to confirm.
- Do not refactor code outside the scope of the current task.

### After Implementation
1. Run the full verification suite before marking done:
   ```bash
   pnpm typecheck   # TypeScript strict check
   pnpm lint        # ESLint
   pnpm build       # Next.js build (catches RSC/SSR errors)
   ```
2. If significant changes were made, invoke `@reviewer` for a standards check.
3. Fix all CRITICAL and MAJOR issues from the reviewer before committing.

### Database Changes
- Always run `pnpm db:push` after `src/server/db/schema.ts` changes in development.
- For production, use `drizzle-kit migrate` and note the migration in the commit message.
- Never delete columns without a migration strategy.

## Open WebUI Knowledge Base Integration

The project docs are indexed in Open WebUI Knowledge Bases (via `scripts/upload-knowledge.sh`):

| KB | Slug | What to reference |
|----|------|-------------------|
| Company Standards | `kb-company-standards` | Team conventions, onboarding |
| Coding Standards | `kb-coding-standards` | ESLint rules, Prettier config, AGENTS.md |
| Architecture Docs | `kb-architecture` | PLAN.md, ADRs, DB migrations |
| API Specs | `kb-api-specs` | tRPC routers, procedure signatures |
| README Files | `kb-readme` | Project setup, feature docs |

Reference a KB in chat with `#kb-coding-standards` syntax, or the MCP `openwebui` server tools.

## Model Selection Guide

- **Qwen2.5-Coder 14B** — best for: TypeScript, React, SQL, file editing, test writing
- **Qwen3 14B** — best for: code review, documentation, multi-step reasoning in English
- **DeepSeek-R1 14B** — best for: architecture trade-offs, algorithm selection, hard debugging

> All models run on the Ollama Ubuntu LAN server at `192.168.1.226:11434`. If a model is unavailable,
> check Ollama server status: `curl http://192.168.1.226:11434/api/tags`
