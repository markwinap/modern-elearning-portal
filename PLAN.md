# EduCore LMS — Implementation Plan

## Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Framework | Next.js 15 App Router + React 19                 |
| API       | tRPC v11                                         |
| Database  | Drizzle ORM + PostgreSQL                         |
| Auth      | better-auth v1.3 (email/password + GitHub OAuth) |
| UI        | Ant Design 6                                     |
| Language  | TypeScript strict mode                           |

---

## Phase 1 — Foundation ✅

- [x] `trpc.ts` — `publicProcedure`, `protectedProcedure`, `teacherProcedure`, `adminProcedure`
- [x] `better-auth/config.ts` — admin plugin, emailAndPassword, GitHub OAuth
- [x] `app/layout.tsx` — AntdRegistry + ConfigProvider (colorPrimary `#4F46E5`)
- [x] `app/page.tsx` — landing page with Sign In / Get Started
- [x] `components/layout/app-header.tsx` — notification bell, user dropdown
- [x] `components/layout/app-sider.tsx` — role-aware nav (student / teacher / admin)
- [x] `app/(dashboard)/layout.tsx` — session guard → redirect to /login
- [x] `app/(admin)/layout.tsx` — session guard + admin role guard
- [x] `app/(auth)/login/` — email/password + GitHub OAuth form
- [x] `app/(auth)/register/` — registration with confirm-password validation
- [x] `app/(dashboard)/dashboard/page.tsx` — stats cards placeholder

---

## Phase 2 — Database Schema ✅

All tables created in `src/server/db/schema.ts`:

| Table                                        | Purpose                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `user`, `session`, `account`, `verification` | better-auth (no prefix)                                                                    |
| `categories`                                 | Course categories (id, name, slug, parentId, order)                                        |
| `courses`                                    | Course catalogue (coverImageUrl, maxEnrollments, status enum)                              |
| `courseSections`                             | Ordered sections within a course                                                           |
| `activities`                                 | Lesson/quiz/page/file/url/wiki/workshop items per section                                  |
| `enrollments`                                | Student ↔ course (role: student/teacher/ta; status: active/suspended/completed/waitlisted) |
| `activityProgress`                           | Per-user activity status (not_started/in_progress/completed)                               |
| `courseProgress`                             | Per-user course progressPct                                                                |
| `grades`                                     | rawScore, maxScore, percentage, letterGrade, feedback, gradedById                          |
| `gradeCategories`                            | Weighted grade buckets per course                                                          |
| `announcements`                              | Course announcements                                                                       |
| `messageThreads`                             | Course discussion threads (courseId, subject, createdBy)                                   |
| `messages`                                   | Thread messages (authorId, content, sentAt)                                                |
| `notifications`                              | User notifications (payload jsonb, readAt)                                                 |
| `fileResources`                              | File activity (storageKey, originalName, mimeType, sizeBytes)                              |
| `lessonNodes`                                | Lesson flow graph (single `graph` jsonb field)                                             |
| `pages`                                      | Page activity content                                                                      |
| `quizzes`                                    | Quiz settings (timeLimitSecs, maxAttempts, shuffle flags)                                  |
| `quizQuestions`                              | Per-quiz questions (prompt, options jsonb, correctAnswer jsonb)                            |
| `quizAttempts`                               | Student attempts (startedAt, submittedAt, score, maxScore)                                 |
| `quizAnswers`                                | Per-question answers (answer jsonb, isCorrect, pointsAwarded)                              |
| `workshops`                                  | Workshop settings (phase enum, deadlines, weightings)                                      |
| `workshopRubrics`                            | Rubric criteria (criterion, maxPoints, order)                                              |
| `workshopSubmissions`                        | Student submissions (workshopActivityId, userId, content)                                  |
| `workshopAssessments`                        | Peer/teacher assessments (scores jsonb, totalScore)                                        |
| `wikiPages`                                  | Wiki pages (title, slug, content, version, lockedBy)                                       |
| `wikiRevisions`                              | Wiki revision history (wikiPageId, content, version)                                       |

---

## Phase 3 — tRPC Routers ✅

All 18 routers registered in `src/server/api/root.ts`:

| Router               | Key Procedures                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `userRouter`         | getMe, listUsers, setRole, banUser, unbanUser                                                                  |
| `categoryRouter`     | list, getById, create (auto-slug), update, delete                                                              |
| `courseRouter`       | list, getBySlug, getById, getMyCourses, create, update, publish, archive, getEnrollmentCount                   |
| `sectionRouter`      | listByCourse, create, update, delete, reorder                                                                  |
| `activityRouter`     | listBySection, getById, create, update, delete                                                                 |
| `enrollmentRouter`   | enroll, unenroll, getMyEnrollments, getStudents, updateStatus, isEnrolled                                      |
| `progressRouter`     | markActivity, getActivityProgress, getCourseProgress, updateCourseProgress                                     |
| `gradebookRouter`    | getMyGrades, getCourseGrades, submitGrade, listCategories, createCategory                                      |
| `announcementRouter` | listByCourse, create, update, delete                                                                           |
| `messageRouter`      | listByCourse, createThread, getMessages, sendMessage, deleteMessage                                            |
| `notificationRouter` | getMyNotifications, markRead, markAllRead, getUnreadCount                                                      |
| `fileRouter`         | getByActivity, upsert, delete                                                                                  |
| `quizRouter`         | getQuiz, upsertQuiz, listQuestions, createQuestion, startAttempt, submitAttempt, getMyAttempts                 |
| `lessonRouter`       | getGraph, saveGraph                                                                                            |
| `pageRouter`         | getByActivity, upsert                                                                                          |
| `wikiRouter`         | listPages, getPage, upsertPage, getRevisions, lockPage, unlockPage                                             |
| `workshopRouter`     | getWorkshop, upsertWorkshop, listRubrics, addRubric, submit, listSubmissions, submitAssessment, getAssessments |
| `postRouter`         | (T3 starter placeholder)                                                                                       |

---

## Phase 4 — Student Experience ⬜

Pages under `src/app/(dashboard)/`:

- [ ] `courses/page.tsx` — browse/search published courses (Server Component, tRPC `course.list`)
- [ ] `courses/[slug]/page.tsx` — course detail + enroll button
- [ ] `courses/[slug]/learn/page.tsx` — enrolled view: section/activity sidebar
- [ ] `courses/[slug]/learn/[activityId]/page.tsx` — activity viewer (lesson/page/quiz/file/wiki dispatch)
- [ ] `my-courses/page.tsx` — enrolled courses with progress bars
- [ ] `profile/page.tsx` — edit name/avatar, change password
- [ ] `notifications/page.tsx` — notification list with mark-read

Activity viewers (Client Components under `_components/`):

- [ ] `LessonViewer` — renders ReactFlow graph (read-only)
- [ ] `PageViewer` — renders rich-text content
- [ ] `QuizTaker` — multi-step question form, submit attempt, show score
- [ ] `FileViewer` — download/view file resource
- [ ] `WikiViewer` — view/edit wiki page with revision history

---

## Phase 5 — Teacher Experience ⬜

Pages under `src/app/(dashboard)/teach/`:

- [ ] `page.tsx` — teacher dashboard (my courses list)
- [ ] `courses/new/page.tsx` — create course form
- [ ] `courses/[id]/edit/page.tsx` — edit course metadata, cover image upload
- [ ] `courses/[id]/sections/page.tsx` — drag-and-drop section/activity builder
- [ ] `courses/[id]/students/page.tsx` — enrollment table with status controls
- [ ] `courses/[id]/gradebook/page.tsx` — grade entry table per activity
- [ ] `courses/[id]/announcements/page.tsx` — create/manage announcements
- [ ] `courses/[id]/discussions/page.tsx` — message thread list + compose

Activity editors (Client Components):

- [ ] `LessonEditor` — ReactFlow canvas for building lesson graph
- [ ] `PageEditor` — rich-text editor (Tiptap or similar)
- [ ] `QuizEditor` — question builder (add/remove/reorder questions)
- [ ] `WorkshopEditor` — phase controls, rubric builder, submission review
- [ ] `WikiEditor` — wiki page edit with version diff

---

## Phase 6 — Admin Panel ⬜

Pages under `src/app/(admin)/admin/`:

- [ ] `page.tsx` — admin dashboard (user count, course count, enrollment count)
- [ ] `users/page.tsx` — paginated user table, role assignment, ban/unban
- [ ] `courses/page.tsx` — all courses with publish/archive controls
- [ ] `categories/page.tsx` — category tree CRUD

---

## Phase 7 — Progress Engine & Gradebook ⬜

- [ ] Auto-update `courseProgress` when all activities completed (server-side trigger in `progressRouter.markActivity`)
- [ ] Grade weighting calculation using `gradeCategories.weight`
- [ ] Letter grade computation from `percentage`
- [ ] Gradebook export (CSV) for teachers
- [ ] Progress report page for students

---

## Phase 8 — Communication & File Uploads ⬜

- [ ] File upload flow: presigned S3/R2 URL → upload → save `fileResources` record via `file.upsert`
- [ ] Real-time notifications: polling or WebSocket (Server-Sent Events) for `notifications`
- [ ] Email notifications via better-auth hooks (enrollment confirmation, grade posted)
- [ ] Discussion threads: message pagination, reply threading

---

## Pending: DB Migration

```bash
pnpm db:generate   # generate migration SQL from schema
pnpm db:migrate    # apply migration to database
```

> Run after confirming `.env` `DATABASE_URL` is set.
