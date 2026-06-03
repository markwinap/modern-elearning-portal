import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const activityTypeEnum = pgEnum("activity_type", [
  "file",
  "lesson",
  "page",
  "quiz",
  "text_media",
  "url",
  "wiki",
  "workshop",
]);
export const courseStatusEnum = pgEnum("course_status", [
  "draft",
  "published",
  "archived",
]);
export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "active",
  "suspended",
  "completed",
  "waitlisted",
]);
export const enrollmentRoleEnum = pgEnum("enrollment_role", [
  "student",
  "teacher",
]);
export const activityProgressStatusEnum = pgEnum("activity_progress_status", [
  "not_started",
  "in_progress",
  "completed",
]);
export const completionTypeEnum = pgEnum("completion_type", [
  "view",
  "submit",
  "grade",
  "time",
]);
export const workshopPhaseEnum = pgEnum("workshop_phase", [
  "setup",
  "submission",
  "assessment",
  "grading",
  "closed",
]);
export const quizQuestionTypeEnum = pgEnum("quiz_question_type", [
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank",
  "matching",
  "ordering",
  "essay",
]);
export const urlOpenModeEnum = pgEnum("url_open_mode", [
  "same_tab",
  "new_tab",
  "modal",
]);

// ─── User role enum ───────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", [
  "student",
  "teacher",
  "admin",
]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];

// ─── App table factory (applies "pg-drizzle_" prefix) ────────────────────────
export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

// ─── Legacy posts table (T3 scaffold) ────────────────────────────────────────
export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("post_created_by_idx").on(t.createdById)],
);

// ─── Auth tables (no prefix — managed by better-auth) ────────────────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  // better-auth admin plugin fields
  role: userRoleEnum("role").notNull().default("student"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// ─── Categories (adjacency-list tree) ────────────────────────────────────────
export const categories = createTable(
  "category",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 128 }).notNull(),
    slug: d.varchar({ length: 128 }).notNull().unique(),
    parentId: d.integer(),
    description: d.text(),
    order: d.integer().default(0).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("category_parent_idx").on(t.parentId),
    index("category_slug_idx").on(t.slug),
  ],
);

// ─── Courses ──────────────────────────────────────────────────────────────────
export const courses = createTable(
  "course",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    title: d.varchar({ length: 256 }).notNull(),
    slug: d.varchar({ length: 256 }).notNull().unique(),
    description: d.text(),
    categoryId: d
      .integer()
      .notNull()
      .references(() => categories.id),
    teacherId: d
      .text()
      .notNull()
      .references(() => user.id),
    status: courseStatusEnum("status").default("draft").notNull(),
    coverImageUrl: d.text(),
    accessKey: d.varchar({ length: 64 }),
    maxEnrollments: d.integer(),
    startsAt: d.timestamp({ withTimezone: true }),
    endsAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("course_category_idx").on(t.categoryId),
    index("course_teacher_idx").on(t.teacherId),
    index("course_status_idx").on(t.status),
    index("course_slug_idx").on(t.slug),
  ],
);

// ─── Course Sections ──────────────────────────────────────────────────────────
export const courseSections = createTable(
  "course_section",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    courseId: d
      .integer()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: d.varchar({ length: 256 }).notNull(),
    order: d.integer().default(0).notNull(),
    visible: d.boolean().default(true).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("section_course_idx").on(t.courseId)],
);

// ─── Activities (polymorphic header) ─────────────────────────────────────────
export const activities = createTable(
  "activity",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    sectionId: d
      .integer()
      .notNull()
      .references(() => courseSections.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    title: d.varchar({ length: 256 }).notNull(),
    order: d.integer().default(0).notNull(),
    visible: d.boolean().default(true).notNull(),
    completionType: completionTypeEnum("completion_type").default("view").notNull(),
    completionGrade: d.integer(),
    completionTimeSecs: d.integer(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("activity_section_idx").on(t.sectionId),
    index("activity_type_idx").on(t.type),
  ],
);

// ─── File Resources ───────────────────────────────────────────────────────────
export const fileResources = createTable("file_resource", (d) => ({
  activityId: d
    .integer()
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  storageKey: d.text().notNull(),
  originalName: d.varchar({ length: 512 }).notNull(),
  mimeType: d.varchar({ length: 128 }).notNull(),
  sizeBytes: d.integer().notNull(),
  forceDownload: d.boolean().default(false).notNull(),
  version: d.integer().default(1).notNull(),
  createdAt: d
    .timestamp({ withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
}));

// ─── Lessons (branching node graph stored as JSONB) ───────────────────────────
export const lessonNodes = createTable("lesson_node", (d) => ({
  activityId: d
    .integer()
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  graph: d.jsonb().$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

// ─── Pages (rich-text) ────────────────────────────────────────────────────────
export const pages = createTable("page", (d) => ({
  activityId: d
    .integer()
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  content: d.text().notNull().default(""),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

// ─── Quizzes ──────────────────────────────────────────────────────────────────
export const quizzes = createTable("quiz", (d) => ({
  activityId: d
    .integer()
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  timeLimitSecs: d.integer(),
  maxAttempts: d.integer().default(1).notNull(),
  shuffleQuestions: d.boolean().default(false).notNull(),
  shuffleAnswers: d.boolean().default(false).notNull(),
  showFeedback: d.boolean().default(true).notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

export const quizQuestions = createTable(
  "quiz_question",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    quizActivityId: d
      .integer()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    type: quizQuestionTypeEnum("type").notNull(),
    prompt: d.text().notNull(),
    options: d.jsonb().$type<unknown[]>(),
    correctAnswer: d.jsonb().$type<unknown>(),
    points: d.integer().default(1).notNull(),
    order: d.integer().default(0).notNull(),
  }),
  (t) => [index("quiz_question_activity_idx").on(t.quizActivityId)],
);

export const quizAttempts = createTable(
  "quiz_attempt",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    quizActivityId: d
      .integer()
      .notNull()
      .references(() => activities.id),
    userId: d.text().notNull().references(() => user.id),
    startedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    submittedAt: d.timestamp({ withTimezone: true }),
    score: d.integer(),
    maxScore: d.integer(),
  }),
  (t) => [index("quiz_attempt_activity_user_idx").on(t.quizActivityId, t.userId)],
);

export const quizAnswers = createTable(
  "quiz_answer",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    attemptId: d
      .integer()
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: d
      .integer()
      .notNull()
      .references(() => quizQuestions.id),
    answer: d.jsonb().$type<unknown>().notNull(),
    isCorrect: d.boolean(),
    pointsAwarded: d.integer().default(0).notNull(),
  }),
  (t) => [index("quiz_answer_attempt_idx").on(t.attemptId)],
);

// ─── Text & Media ─────────────────────────────────────────────────────────────
export const textMediaBlocks = createTable("text_media_block", (d) => ({
  activityId: d
    .integer()
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  content: d.text().notNull().default(""),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

export type TextMediaBlock = typeof textMediaBlocks.$inferSelect;

// ─── URL Resources ────────────────────────────────────────────────────────────
export const urlResources = createTable("url_resource", (d) => ({
  activityId: d
    .integer()
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  url: d.text().notNull(),
  label: d.varchar({ length: 256 }),
  description: d.text(),
  openMode: urlOpenModeEnum("open_mode").default("new_tab").notNull(),
  thumbnailUrl: d.text(),
}));

// ─── Wiki ─────────────────────────────────────────────────────────────────────
export const wikiPages = createTable(
  "wiki_page",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    activityId: d
      .integer()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    title: d.varchar({ length: 256 }).notNull(),
    slug: d.varchar({ length: 256 }).notNull(),
    content: d.text().notNull().default(""),
    authorId: d.text().notNull().references(() => user.id),
    version: d.integer().default(1).notNull(),
    lockedBy: d.text().references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("wiki_page_activity_idx").on(t.activityId),
    unique("wiki_page_activity_slug").on(t.activityId, t.slug),
  ],
);

export const wikiRevisions = createTable(
  "wiki_revision",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    wikiPageId: d
      .integer()
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    content: d.text().notNull(),
    authorId: d.text().notNull().references(() => user.id),
    version: d.integer().notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [index("wiki_revision_page_idx").on(t.wikiPageId)],
);

// ─── Workshops ────────────────────────────────────────────────────────────────
export const workshops = createTable("workshop", (d) => ({
  activityId: d
    .integer()
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  phase: workshopPhaseEnum("phase").default("setup").notNull(),
  submissionDeadline: d.timestamp({ withTimezone: true }),
  assessmentDeadline: d.timestamp({ withTimezone: true }),
  maxSubmissions: d.integer().default(1).notNull(),
  peerAssessmentsRequired: d.integer().default(3).notNull(),
  teacherWeighting: d.integer().default(50).notNull(),
  peerWeighting: d.integer().default(50).notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

export const workshopRubrics = createTable(
  "workshop_rubric",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    workshopActivityId: d
      .integer()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    criterion: d.varchar({ length: 256 }).notNull(),
    description: d.text(),
    maxPoints: d.integer().notNull(),
    order: d.integer().default(0).notNull(),
  }),
  (t) => [index("workshop_rubric_activity_idx").on(t.workshopActivityId)],
);

export const workshopSubmissions = createTable(
  "workshop_submission",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    workshopActivityId: d
      .integer()
      .notNull()
      .references(() => activities.id),
    userId: d.text().notNull().references(() => user.id),
    content: d.text().notNull(),
    attachmentKey: d.text(),
    submittedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("workshop_submission_activity_user_idx").on(t.workshopActivityId, t.userId),
  ],
);

export const workshopAssessments = createTable(
  "workshop_assessment",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    submissionId: d
      .integer()
      .notNull()
      .references(() => workshopSubmissions.id, { onDelete: "cascade" }),
    assessorId: d.text().notNull().references(() => user.id),
    scores: d.jsonb().$type<Record<string, number>>().notNull().default({}),
    feedback: d.text(),
    totalScore: d.integer(),
    submittedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [index("workshop_assessment_submission_idx").on(t.submissionId, t.assessorId)],
);

// ─── Enrollments ──────────────────────────────────────────────────────────────
export const enrollments = createTable(
  "enrollment",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    courseId: d
      .integer()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: d.text().notNull().references(() => user.id),
    role: enrollmentRoleEnum("role").default("student").notNull(),
    status: enrollmentStatusEnum("status").default("active").notNull(),
    enrolledAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    startDate: d.timestamp({ withTimezone: true }),
    endDate: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    unique("enrollment_course_user").on(t.courseId, t.userId),
    index("enrollment_course_status_idx").on(t.courseId, t.status),
    index("enrollment_user_status_idx").on(t.userId, t.status),
  ],
);

// ─── Progress ─────────────────────────────────────────────────────────────────
export const activityProgress = createTable(
  "activity_progress",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    activityId: d
      .integer()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    userId: d.text().notNull().references(() => user.id),
    status: activityProgressStatusEnum("status").default("not_started").notNull(),
    firstViewedAt: d.timestamp({ withTimezone: true }),
    completedAt: d.timestamp({ withTimezone: true }),
    timeSpentSecs: d.integer().default(0).notNull(),
  }),
  (t) => [unique("activity_progress_activity_user").on(t.activityId, t.userId)],
);

export const courseProgress = createTable(
  "course_progress",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    courseId: d
      .integer()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: d.text().notNull().references(() => user.id),
    progressPct: d.integer().default(0).notNull(),
    completedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [unique("course_progress_course_user").on(t.courseId, t.userId)],
);

// ─── Gradebook ────────────────────────────────────────────────────────────────
export const gradeCategories = createTable(
  "grade_category",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    courseId: d
      .integer()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    name: d.varchar({ length: 128 }).notNull(),
    weight: d.integer().default(100).notNull(),
    order: d.integer().default(0).notNull(),
  }),
  (t) => [index("grade_category_course_idx").on(t.courseId)],
);

export const grades = createTable(
  "grade",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    activityId: d
      .integer()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    userId: d.text().notNull().references(() => user.id),
    gradeCategoryId: d.integer().references(() => gradeCategories.id),
    rawScore: d.integer(),
    maxScore: d.integer(),
    percentage: d.integer(),
    letterGrade: d.varchar({ length: 4 }),
    feedback: d.text(),
    gradedAt: d.timestamp({ withTimezone: true }),
    gradedById: d.text().references(() => user.id),
  }),
  (t) => [
    unique("grade_activity_user").on(t.activityId, t.userId),
    index("grade_user_activity_idx").on(t.userId, t.activityId),
  ],
);

// ─── Communication ────────────────────────────────────────────────────────────
export const announcements = createTable(
  "announcement",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    courseId: d
      .integer()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    authorId: d.text().notNull().references(() => user.id),
    title: d.varchar({ length: 256 }).notNull(),
    content: d.text().notNull(),
    pinned: d.boolean().default(false).notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("announcement_course_idx").on(t.courseId)],
);

export const messageThreads = createTable(
  "message_thread",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    courseId: d.integer().references(() => courses.id),
    subject: d.varchar({ length: 256 }).notNull(),
    createdBy: d.text().notNull().references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [index("message_thread_course_idx").on(t.courseId)],
);

export const messages = createTable(
  "message",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    threadId: d
      .integer()
      .notNull()
      .references(() => messageThreads.id, { onDelete: "cascade" }),
    authorId: d.text().notNull().references(() => user.id),
    content: d.text().notNull(),
    sentAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [index("message_thread_sent_idx").on(t.threadId, t.sentAt)],
);

export const notifications = createTable(
  "notification",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d.text().notNull().references(() => user.id),
    type: d.text().notNull(),
    payload: d.jsonb().$type<Record<string, unknown>>().notNull().default({}),
    readAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [index("notification_user_read_idx").on(t.userId, t.readAt)],
);

// ─── Type exports ─────────────────────────────────────────────────────────────
export type User = typeof user.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CourseSection = typeof courseSections.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type WorkshopSubmission = typeof workshopSubmissions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
