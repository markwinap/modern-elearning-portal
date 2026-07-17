# Modern E-Learning Portal

> **Important Notice**
>
> This repository is used for testing coding agents' capabilities and for testing refactors, skills, custom agents, rules, and context usage. It is not intended for production use.

A full-stack, type-safe learning management system for students, teachers, and administrators. Built with the T3 Stack and Ant Design 6.

## Stack

| Layer           | Technology                                       |
| --------------- | ------------------------------------------------ |
| Framework       | Next.js 15 (App Router, React 19, Turbopack)     |
| API             | tRPC v11                                         |
| Database        | Drizzle ORM + PostgreSQL                         |
| Auth            | better-auth v1.3 (email/password + GitHub OAuth) |
| UI              | Ant Design 6                                     |
| Language        | TypeScript (strict)                              |
| Package Manager | pnpm 10                                          |

## Features

- Role-based dashboards and workflows for students, teachers, and administrators
- Hierarchical course categories and a searchable course catalog
- Enrollments with self-enrollment, access keys, manual enrollment, and waitlists
- Eight activity types: File, Lesson, Page, Quiz, Text & Media, URL, Wiki, and Workshop
- End-to-end type-safe API with tRPC v11 and Zod input validation
- Drizzle ORM schema as the single source of truth for PostgreSQL
- better-auth authentication with email/password and GitHub OAuth
- Gradebook, progress tracking, announcements, discussions, and notifications
- Admin panel for users, courses, categories, and platform settings

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL URL, Better Auth secret, and optional GitHub OAuth credentials

# 3. Set up the database
pnpm db:push            # development only; use pnpm db:migrate in production

# 4. Start the dev server
pnpm dev                # http://localhost:3000
```

## Scripts

| Script                                    | Purpose                                       |
| ----------------------------------------- | --------------------------------------------- |
| `pnpm dev`                                | Start the Next.js dev server (Turbopack)      |
| `pnpm build`                              | Build for production                          |
| `pnpm lint` / `pnpm lint:fix`             | Run ESLint                                    |
| `pnpm format:check` / `pnpm format:write` | Run Prettier                                  |
| `pnpm typecheck`                          | Run TypeScript with `--noEmit`                |
| `pnpm db:generate`                        | Generate a Drizzle migration from `schema.ts` |
| `pnpm db:migrate`                         | Apply migrations (production)                 |
| `pnpm db:push`                            | Push schema changes directly (development)    |
| `pnpm db:studio`                          | Open Drizzle Studio                           |

## Environment Variables

See [`.env.example`](.env.example) for the full list. Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — secret for better-auth token signing
- `BETTER_AUTH_GITHUB_CLIENT_ID` / `BETTER_AUTH_GITHUB_CLIENT_SECRET` — optional GitHub OAuth
- `TAVILY_API_KEY` — optional, for Tavily MCP
- `OPENWEBUI_API_KEY` — optional, for Open WebUI

## Project Structure

```
src/
├── app/                 # Next.js App Router pages and layouts
├── components/          # Shared UI components
├── server/
│   ├── api/routers/     # tRPC routers
│   ├── db/              # Drizzle schema and client
│   └── better-auth/     # better-auth config and helpers
├── trpc/                # tRPC server caller and React hooks
└── env.js               # Validated environment variables
```

## Contributing

See [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md). Project conventions are also summarized in [`AGENTS.md`](AGENTS.md).

## Acknowledgments

- [T3 Stack](https://create.t3.gg/)
- [Next.js](https://nextjs.org/)
- [tRPC](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [better-auth](https://www.better-auth.com/)
- [Ant Design](https://ant.design/)
