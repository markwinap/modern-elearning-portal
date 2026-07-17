# Modern E-Learning Portal — Implementation Plan

## Overview

Modern E-Learning Portal is a full-stack learning management system built on the T3 Stack: Next.js 15, tRPC v11, Drizzle ORM, better-auth, and Ant Design 6. This plan tracks the implementation roadmap.

## Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Framework | Next.js 15 App Router + React 19 + Turbopack     |
| API       | tRPC v11                                         |
| Database  | Drizzle ORM + PostgreSQL                         |
| Auth      | better-auth v1.3 (email/password + GitHub OAuth) |
| UI        | Ant Design 6                                     |
| Language  | TypeScript strict mode                           |

## Status Summary

- Foundation, database schema, tRPC routers, and admin panel are complete.
- Student and teacher experiences are mostly functional; a few advanced activity viewers and editors are still placeholders.
- Progress engine, gradebook weighting, file uploads, and real-time communication are still in progress.

## Phases

### Phase 1 — Foundation ✅

- tRPC procedures (`publicProcedure`, `protectedProcedure`, `teacherProcedure`, `adminProcedure`)
- better-auth config (email/password + GitHub OAuth)
- Root layout with `AntdRegistry` + `ConfigProvider`
- Landing page, login, register, and protected dashboard/admin layouts
- Role-aware app header, sider, and notification bell

### Phase 2 — Database Schema ✅

- All app and auth tables defined in `src/server/db/schema.ts`
- Migrations generated under `drizzle/`

### Phase 3 — tRPC Routers ✅

21 routers registered in `src/server/api/root.ts`:

`user`, `category`, `course`, `section`, `settings`, `activity`, `enrollment`, `progress`, `gradebook`, `announcement`, `message`, `notification`, `file`, `quiz`, `lesson`, `page`, `textMedia`, `url`, `wiki`, `workshop`, `post`.

### Phase 4 — Student Experience 🟡

- Browse courses, course detail, enrollment, and learning view
- Activity viewers: page, file, quiz, text & media (working); lesson, url, wiki, workshop (placeholders)
- My courses list, profile editor, notifications center, and grades page

### Phase 5 — Teacher Experience 🟡

- Teacher dashboard, course create/edit, section builder, students, gradebook, announcements, discussions
- Activity editors: page, quiz, file, text & media, url (working); lesson, workshop, wiki (placeholders)
- Drag-and-drop section ordering and rich-text WYSIWYG not yet implemented

### Phase 6 — Admin Panel ✅

- Admin dashboard, user management, course management, category tree, platform settings

### Phase 7 — Progress Engine & Gradebook ⬜

- Auto-updating course progress when activities complete
- Grade weighting calculation
- Letter grade computation
- Gradebook CSV export
- Student progress report page

### Phase 8 — Communication & File Uploads ⬜

- Presigned S3/R2 file upload flow
- Real-time notifications via WebSocket/SSE
- Email notifications for enrollment and grades
- Discussion threading and message pagination

## Next Steps

1. Finish Lesson, Wiki, and Workshop viewers and editors.
2. Implement gradebook weighting and CSV export.
3. Add file uploads with presigned URLs.
4. Add real-time notifications and email delivery.
5. Add discussion threading and message pagination.

## Verification

Run before committing:

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

For database schema changes:

```bash
pnpm db:generate
pnpm db:push        # development
pnpm db:migrate     # production
```
