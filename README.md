# E-Learning Portal

A fully custom-built, cloud-native Learning Management System (LMS) engineered from the ground up for students, teachers, and administrators. EduCore delivers structured digital education through a modular content engine, role-based access control, hierarchical course organization, and a rich suite of interactive activity types — all powered by a typesafe T3 Stack full-stack architecture with Ant Design 5 UI components.

---

## Description

EduCore is a purpose-built, full-stack e-learning platform developed entirely from scratch using the **T3 Stack** — a TypeScript-first, end-to-end typesafe architecture combining Next.js (App Router), tRPC v11, Drizzle ORM, and NextAuth.js. The UI is built entirely with **Ant Design 5** enterprise-grade React components, providing a consistent, accessible, and professional interface across all user personas.

The platform serves three primary user roles — students, teachers, and administrators — each with dedicated dashboards, role-scoped server procedures, and tailored workflows. Courses are structured within a hierarchical system of categories and subcategories, allowing institutions to organize curricula by department, subject area, or program level.

Teachers compose course content by combining eight activity and resource types: **Files**, **Lessons**, **Pages**, **Quizzes**, **Text & Media areas**, **URLs**, **Wikis**, and **Workshops**. All API communication between the Next.js frontend and the server layer is handled exclusively through **tRPC v11** — no separate REST or GraphQL endpoints are needed. tRPC procedures run inside Next.js Route Handlers and are callable directly from React Server Components using the `createCaller` pattern, eliminating redundant fetch overhead in the App Router.

The database layer is managed entirely by **Drizzle ORM**, which uses pure TypeScript schema definitions as the single source of truth for both queries and SQL migration generation via `drizzle-kit`. Authentication is handled by **NextAuth.js (Auth.js v5)**, which integrates natively with the App Router, supports database sessions backed by Drizzle, and ships preconfigured OAuth2 providers alongside credential-based login.

Progress tracking, a dynamic gradebook, completion rule engines, and real-time analytics pipelines give institutions deep visibility into learner performance and course effectiveness.

---

## User Roles

### Student

Browse and enroll in courses, consume content activities, submit assessments, participate in collaborative wikis and workshops, and track personal progress and grades via a personalized Ant Design dashboard.

### Teacher

Create and manage course content, configure all eight activity types, define grading rubrics, review and grade student submissions, manage enrollments, and communicate with learners via announcements and messaging.

### Administrator

Manage all users, roles and permissions, platform categories, authentication providers, system-wide settings, reporting dashboards, and infrastructure configuration. Full admin panel built with Ant Design Table, Form, and Layout components.

---

## Activity & Resource Types

### File

Upload and distribute course documents in any format (PDF, DOCX, XLSX, ZIP, MP4). Files are stored on cloud object storage (S3-compatible via presigned URLs) and served through a CDN. Supports per-file access control tied to enrollment status, a forced-download toggle, and version history. Upload UI uses Ant Design `Upload` and `Dragger` components.

### Lesson

Multi-step, branching learning units built on a node-graph engine stored as a JSONB tree in PostgreSQL via Drizzle. Each node renders content and an optional question; student responses determine the next node. Supports adaptive paths, scored question gates, time estimates, and sequential page enforcement. Teacher authoring uses Ant Design `Steps` and `Card` components.

### Page

Rich-text content pages authored in a custom WYSIWYG editor (TipTap/ProseMirror). Supports inline images, embedded video, tables, code blocks, LaTeX math rendering, and semantic HTML5 accessibility annotations. Page metadata and content are stored in Drizzle-managed PostgreSQL tables and retrieved via typed tRPC queries.

### Quiz

Configurable assessment engine backed by a multi-type question bank: multiple choice, true/false, short answer, fill-in-the-blank, matching, drag-and-drop ordering, and essay. Supports timed attempts, attempt limits, randomized question and answer order, and auto-grading with instant feedback. Built with Ant Design `Form`, `Radio`, `Checkbox`, and `InputNumber` components.

### Text & Media

Inline content blocks combining formatted text, images, audio players, and video embeds. Used as contextual separators or introductory content between activities within a course section. Supports YouTube, Vimeo, and direct media embeds with responsive layouts via Ant Design `Space` and `Typography` components.

### URL

Links students to external web resources or documents. Configurable to open in the same frame, a new tab, or a modal popup using Ant Design `Modal`. Supports a custom label, description, preview thumbnail, and completion-on-click event logging captured by a tRPC mutation.

### Wiki

Collaborative in-platform encyclopedia where course participants co-author and link interconnected pages. Built on an Operational Transformation (OT) engine for real-time co-editing over WebSockets. Supports individual and group wiki modes, full version history, diff comparison, and page locking. Ant Design `Tabs` and `Descriptions` components structure the wiki viewer.

### Workshop

Structured peer assessment activity driven by a phased state machine: **Setup → Submission → Assessment → Grading → Closed**. Teachers define multi-criterion rubrics stored in Drizzle-typed schema; students submit work and evaluate peers. The final grade aggregates teacher and peer scores with configurable weighting. Phase transitions are managed by tRPC mutations with server-side state validation.

---

## Platform Features

### Course Categorization

Courses are organized in a multi-level hierarchy of categories and subcategories stored as an adjacency-list tree in PostgreSQL, defined and queried via Drizzle ORM. Administrators define the taxonomy; teachers assign courses to category nodes. The UI uses Ant Design `Tree`, `Breadcrumb`, and `Menu` components for navigation, with full-text search powered by PostgreSQL `tsvector` indexes.

### Authentication & Access Control

Authentication is handled by **NextAuth.js (Auth.js v5)** integrated natively with the Next.js App Router. Supports email/password credentials, OAuth2 (Google, Microsoft), and database sessions stored in PostgreSQL via the Drizzle adapter. Role-based access control (RBAC) is enforced through **tRPC middleware** — protected procedures check session role before executing, scoped per context: platform, category, course, and activity.

### Gradebook & Analytics

Centralized gradebook aggregating scores from all graded activity types (Quiz, Workshop, File submissions). Grades are stored in Drizzle-managed tables with typed relations. Supports weighted grade categories, custom grade scales, and configurable letter-grade boundaries. Teacher and admin dashboards use **Ant Design Charts (AntV/G2)** for real-time engagement and score distribution visualizations. Reports are exportable as CSV or PDF.

### Completion & Progress Engine

Per-activity completion conditions are evaluated by a server-side rules engine invoked via tRPC: viewed, submitted, minimum grade achieved, or minimum time spent. Course-level completion aggregates activity conditions using configurable AND/OR logic. Progress state is stored in Redis for sub-millisecond reads and durably persisted in PostgreSQL via Drizzle.

### Enrollment Management

Supports self-enrollment (with optional access key), manual enrollment by teachers and admins, and bulk cohort enrollment via CSV import parsed on the server. Each enrollment record stores start/end dates, role, capacity limits, and waitlist status. Enrollment workflows are managed through tRPC mutations with Zod input validation. Ant Design `Table`, `Tag`, and `Badge` components render enrollment dashboards.

### Communication Tools

Built-in real-time messaging using WebSockets (Socket.IO), course announcement feeds rendered with Ant Design `Timeline` and `Alert` components, and threaded discussion forums with Markdown support via `@uiw/react-md-editor`. Teachers send bulk push and email notifications via a Node.js background worker. Video classroom sessions can be embedded via WebRTC or third-party integrations (Zoom, Jitsi).

### API Layer (tRPC v11)

All client-server communication is handled through **tRPC v11** with no separate REST or GraphQL API. tRPC routers are organized per domain (courses, users, quizzes, enrollments, etc.) and exposed via a single Next.js Route Handler (`/api/trpc/[trpc]`). Server Components call procedures directly via `createCaller` with no HTTP overhead. Client Components use `useTRPC()` with **TanStack Query v5** for caching, invalidation, and optimistic updates. Subscriptions use `httpSubscription` with Server-Sent Events (SSE) for real-time progress updates and notifications. All inputs are validated with **Zod** schemas shared between client and server.

### Database Layer (Drizzle ORM)

The entire database schema is declared in TypeScript using **Drizzle ORM** — no separate `.prisma` language or code generation step. Drizzle is the single source of truth for both runtime queries and SQL migration generation via `drizzle-kit generate` and `drizzle-kit migrate`. Supports advanced PostgreSQL features including JSONB columns (for quiz question banks and lesson node graphs), full-text search with `tsvector`, adjacency-list trees (course categories), and read replica routing. **Drizzle Studio** provides a browser-based database UI for development and debugging.

### Accessibility & Internationalization

Ant Design 5 ships with full RTL support and built-in internationalization via its `ConfigProvider` and locale system, supporting 69+ languages. WCAG 2.1 AA compliance is maintained across all custom components. Automated accessibility scans with Axe are integrated into the CI pipeline. The interface is fully responsive across desktop, tablet, and mobile viewports using Ant Design's 24-column `Grid` system.

---

## Project Features

### Environment Variable Sync Using Doppler

```bash
doppler login
doppler setup --project modern-elearning-portal --config dev
# Download secrets to .env
doppler secrets download --no-file --format env > .env
# Upload local .env to Doppler
doppler secrets upload .env
# Run with secrets injected
doppler run -- npm run dev
doppler run --project modern-elearning-portal --config dev -- npm run dev
```

### Install and Run

```bash
pnpm install
pnpm db:migrate        # Apply database migrations
pnpm dev               # Start the development server (Turbopack)
```

### Database Management

```bash
pnpm db:generate       # Generate a new migration from schema changes
pnpm db:migrate        # Apply pending migrations
pnpm db:push           # Push schema directly (dev only)
pnpm db:studio         # Open Drizzle Studio to browse the database
```
