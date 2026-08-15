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

### Authentication & Roles

- better-auth v1.3 authentication with email/password and GitHub OAuth
- Role-based access for students, teachers, and administrators
- Protected dashboard and admin route groups with server-side session guards

### Course Catalog & Enrollment

- Hierarchical course categories with parent/child relationships
- Searchable, paginated course catalog with category filtering
- Public course detail pages with enrollment status
- Flexible enrollment modes: open self-enrollment, access-key enrollment, manual enrollment, and waitlists
- Course scheduling with online/onsite location support and recurring session times

### Course Content & Learning

- Course structure organized into ordered, visible/hidden sections
- Eight learning activity types: File, Lesson, Page, Quiz, Text & Media, URL, Wiki, and Workshop
- File resources with upload/download support
- Rich-text Pages and Text & Media content
- Branching Lessons stored as node graphs
- Quizzes with multiple question types, attempts, time limits, shuffling, and feedback modes
- Wiki pages with versioning and revision history
- Workshops with submission, peer assessment, rubrics, and weighted teacher/peer grading
- Activity completion tracking by view, submit, grade, or time spent
- Student learning view that redirects to the first available activity and tracks progress

### Communication

- Course announcements with pinning
- Course discussions and direct message threads
- User notification inbox with read/unread status

### Grading & Progress

- Gradebook with weighted grade categories
- Per-activity grades with auto-graded and manually graded support
- Student-facing grade report and course progress summary
- Teacher insights and recent activity feeds

### Teaching & Administration

- Teacher dashboard to create, edit, and manage courses
- Course authoring: sections, activities, announcements, discussions, students, and gradebook
- Admin dashboard with platform statistics
- User management, course management, category management, and platform settings

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
| `pnpm test`                               | Run unit tests (Vitest)                       |
| `pnpm test:watch`                         | Run unit tests in watch mode                  |
| `pnpm test:e2e:install`                   | Download Playwright browser binaries          |
| `pnpm test:e2e`                           | Run end-to-end tests (Playwright)             |
| `pnpm test:e2e:ui`                        | Run end-to-end tests in Playwright's UI mode  |

## Environment Variables

See [`.env.example`](.env.example) for the full list. Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — secret for better-auth token signing
- `BETTER_AUTH_GITHUB_CLIENT_ID` / `BETTER_AUTH_GITHUB_CLIENT_SECRET` — optional GitHub OAuth
- `TAVILY_API_KEY` — optional, for Tavily MCP
- `OPENWEBUI_API_KEY` — optional, for Open WebUI
- `E2E_TEACHER_EMAIL` / `E2E_TEACHER_PASSWORD` and `E2E_STUDENT_EMAIL` / `E2E_STUDENT_PASSWORD` — optional, only needed to run authenticated Playwright e2e tests (see [Testing](#testing))

## Testing

Unit tests use Vitest; end-to-end tests use Playwright.

```bash
# Unit tests
pnpm test               # run once
pnpm test:watch         # watch mode

# End-to-end tests
pnpm test:e2e:install   # one-time: download the Playwright browser binary
pnpm test:e2e           # run headless
pnpm test:e2e:ui        # run in Playwright's interactive UI mode
```

### Authenticated e2e tests

Most e2e tests need a signed-in session. `e2e/auth.setup.ts` runs before the
rest of the suite, signs in as a teacher and a student, and saves each
session to `e2e/.auth/*.json` (gitignored — never commit these) so individual
tests don't need to log in themselves.

Add these credentials to your `.env` (see `.env.example`) for accounts that
already exist in your database:

```bash
E2E_TEACHER_EMAIL="teacher@example.com"
E2E_TEACHER_PASSWORD="..."
E2E_STUDENT_EMAIL="student@example.com"
E2E_STUDENT_PASSWORD="..."
```

Specs run authenticated based on location:

- `e2e/**/*.spec.ts` (default) — runs as the teacher, via the `chromium` project
- `e2e/student/**/*.spec.ts` — runs as the student, via the `chromium-student` project

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
