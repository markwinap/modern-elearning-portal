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

### Personalized Learner Experience

- Personalized student dashboard with "continue learning", upcoming deadlines, announcements, and recommendations
- Global full-text search across courses, activities, discussions, and wikis with ranked results, filters, and pagination
- Gamification engine with points, badges, levels, streaks, and global/course leaderboards
- `Ctrl/Cmd+K` keyboard shortcut for instant search from the app header
- File resources with upload/download support
- Rich-text Pages and Text & Media content
- Branching Lessons stored as node graphs
- Quizzes with multiple question types, attempts, time limits, shuffling, and feedback modes
- Conditional content release by date, enrollment offset, prerequisite completion/score, or manual instructor release
- Reusable instructor question bank with tags, difficulty, CSV/GIFT import/export, randomized draws, and item analysis
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
| `pnpm test`                               | Run unit & integration tests (Vitest)         |
| `pnpm test:watch`                         | Run unit tests in watch mode                  |
| `pnpm test:coverage`                      | Run tests and generate a coverage report      |
| `pnpm test:e2e:install`                   | Download Playwright browser binaries          |
| `pnpm test:e2e`                           | Run end-to-end tests (Playwright)             |
| `pnpm test:e2e:ui`                        | Run end-to-end tests in Playwright's UI mode  |

## Environment Variables

See [`.env.example`](.env.example) for the full list. Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `TEST_DATABASE_URL` — optional; isolated database used by integration tests
- `BETTER_AUTH_SECRET` — secret for better-auth token signing
- `BETTER_AUTH_GITHUB_CLIENT_ID` / `BETTER_AUTH_GITHUB_CLIENT_SECRET` — optional GitHub OAuth
- `TAVILY_API_KEY` — optional, for Tavily MCP
- `OPENWEBUI_API_KEY` — optional, for Open WebUI
- `E2E_TEACHER_EMAIL` / `E2E_TEACHER_PASSWORD` and `E2E_STUDENT_EMAIL` / `E2E_STUDENT_PASSWORD` — optional, only needed to run authenticated Playwright e2e tests (see [Testing](#testing))

## Testing

Unit tests use Vitest; end-to-end tests use Playwright.

### Running tests locally

```bash
# Run the unit and integration test suite
pnpm test

# Run tests with coverage output to ./coverage
pnpm test:coverage

# Run e2e tests (requires a running dev server via Playwright's webServer config)
pnpm test:e2e:install
pnpm test:e2e
```

### Integration tests

Router integration tests live in `tests/integration/` and run against a real
PostgreSQL database. By default they reuse `DATABASE_URL`; you can point them at
a dedicated test database by setting `TEST_DATABASE_URL` in your `.env` file.
Factories and cleanup helpers are in `tests/factories.ts` to keep tests
isolated and deterministic.

### CI

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs lint,
formatting, type checks, unit/integration tests with coverage, and Playwright
e2e tests against a PostgreSQL service container on every pull request and
push to `main`/`master`.

### Accessibility

Accessibility is enforced by `eslint-plugin-jsx-a11y` and automated axe-core
checks via Playwright in `e2e/accessibility/`. The project also provides:

- A global skip-to-content link in `src/app/layout.tsx`.
- Visible `:focus-visible` outlines and `prefers-reduced-motion` support in
  `src/styles/globals.css`.
- Reusable focus-trap and live-region helpers in `src/lib/a11y.ts`.

Run only the axe-core checks with:

```bash
pnpm test:e2e e2e/accessibility
```

### Mobile / PWA

The app is configured as a Progressive Web App:

- `public/manifest.json` defines the app name, theme, scope, display mode, and icons.
- `public/icons/` contains generated 192x192 and 512x512 icons (including maskable variants).
- `public/sw.js` is a custom service worker that precaches key pages, caches static assets and images, and serves an offline fallback page.
- `src/app/layout.tsx` links the manifest, sets `theme-color` / `viewport-fit=cover`, and registers the service worker in production builds.
- `src/hooks/useOffline.ts` and `src/components/layout/offline-indicator.tsx` show a banner when the network goes offline.
- `src/lib/offline-store.ts` caches course metadata in IndexedDB so learners can keep reading previously visited content offline.
- Mobile layouts include a fixed bottom navigation bar (`src/components/layout/mobile-bottom-nav.tsx`) and a collapsible drawer menu, while the desktop sidebar is hidden on small screens.

The service worker is intentionally disabled in `development` to avoid interfering with Next.js HMR and client-side navigation. To verify PWA installability with Lighthouse or your browser's DevTools, run a production build:

```bash
pnpm build
pnpm start
```

Mobile e2e coverage lives in `e2e/mobile/` and runs against a 375x667 Chromium viewport via the `mobile-student` Playwright project.

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
