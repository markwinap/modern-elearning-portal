import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  unique,
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
export const courseLocationTypeEnum = pgEnum("course_location_type", [
  "online",
  "onsite",
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
export const sectionDurationModeEnum = pgEnum("section_duration_mode", [
  "manual",
  "auto",
]);
export const urlOpenModeEnum = pgEnum("url_open_mode", [
  "same_tab",
  "new_tab",
  "modal",
]);
export const settingsEnrollmentModeEnum = pgEnum("settings_enrollment_mode", [
  "open",
  "approval",
]);
export const settingsDigestFrequencyEnum = pgEnum("settings_digest_frequency", [
  "off",
  "daily",
  "weekly",
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
    locationType: courseLocationTypeEnum("location_type")
      .default("online")
      .notNull(),
    siteLocation: d.text(),
    classroom: d.text(),
    instructorBio: d.text(),
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
    gradable: d.boolean().default(true).notNull(),
    durationMins: d.integer().default(0).notNull(),
    durationMode: sectionDurationModeEnum("duration_mode")
      .default("manual")
      .notNull(),
    pickCount: d.integer(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("section_course_idx").on(t.courseId)],
);

// ─── Course Sessions (on-site schedules) ──────────────────────────────────────
export const courseSessions = createTable(
  "course_session",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    courseId: d
      .integer()
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    dayOfWeek: d.integer().notNull(),
    startDate: d.date({ mode: "string" }).notNull(),
    endDate: d.date({ mode: "string" }),
    startTime: d.time().notNull(),
    endTime: d.time().notNull(),
    location: d.text(),
    classroom: d.text(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("course_session_course_idx").on(t.courseId)],
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

// ─── Activities (polymorphic header) ─────────────────────────────────────────
export const activities = createTable(
  "activity",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    sectionId: d
      .integer()
      .notNull()
      .references(() => courseSections.id, { onDelete: "cascade" }),
    gradeCategoryId: d
      .integer()
      .references(() => gradeCategories.id, { onDelete: "set null" }),
    type: activityTypeEnum("type").notNull(),
    title: d.varchar({ length: 256 }).notNull(),
    order: d.integer().default(0).notNull(),
    visible: d.boolean().default(true).notNull(),
    gradable: d.boolean().default(true).notNull(),
    completionType: completionTypeEnum("completion_type")
      .default("view")
      .notNull(),
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
    allowMultiple: d.boolean().default(false).notNull(),
    points: d.integer().default(1).notNull(),
    order: d.integer().default(0).notNull(),
    recommendedTimeMins: d.integer().default(1).notNull(),
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
    userId: d
      .text()
      .notNull()
      .references(() => user.id),
    startedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    submittedAt: d.timestamp({ withTimezone: true }),
    score: d.integer(),
    maxScore: d.integer(),
  }),
  (t) => [
    index("quiz_attempt_activity_user_idx").on(t.quizActivityId, t.userId),
  ],
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
    timeSpentSecs: d.integer().default(0).notNull(),
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
    authorId: d
      .text()
      .notNull()
      .references(() => user.id),
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
    authorId: d
      .text()
      .notNull()
      .references(() => user.id),
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
    userId: d
      .text()
      .notNull()
      .references(() => user.id),
    content: d.text().notNull(),
    attachmentKey: d.text(),
    submittedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("workshop_submission_activity_user_idx").on(
      t.workshopActivityId,
      t.userId,
    ),
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
    assessorId: d
      .text()
      .notNull()
      .references(() => user.id),
    scores: d.jsonb().$type<Record<string, number>>().notNull().default({}),
    feedback: d.text(),
    totalScore: d.integer(),
    submittedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("workshop_assessment_submission_idx").on(
      t.submissionId,
      t.assessorId,
    ),
  ],
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
    userId: d
      .text()
      .notNull()
      .references(() => user.id),
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
    userId: d
      .text()
      .notNull()
      .references(() => user.id),
    status: activityProgressStatusEnum("status")
      .default("not_started")
      .notNull(),
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
    userId: d
      .text()
      .notNull()
      .references(() => user.id),
    progressPct: d.integer().default(0).notNull(),
    completedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [unique("course_progress_course_user").on(t.courseId, t.userId)],
);

// ─── Gradebook ────────────────────────────────────────────────────────────────

export const grades = createTable(
  "grade",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    activityId: d
      .integer()
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
    userId: d
      .text()
      .notNull()
      .references(() => user.id),
    gradeCategoryId: d
      .integer()
      .references(() => gradeCategories.id, { onDelete: "set null" }),
    rawScore: d.integer(),
    maxScore: d.integer(),
    percentage: d.integer(),
    letterGrade: d.varchar({ length: 4 }),
    feedback: d.text(),
    gradedAt: d.timestamp({ withTimezone: true }),
    gradedById: d.text().references(() => user.id),
    isAutoGraded: d.boolean().default(false).notNull(),
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
    authorId: d
      .text()
      .notNull()
      .references(() => user.id),
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
    createdBy: d
      .text()
      .notNull()
      .references(() => user.id),
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
    authorId: d
      .text()
      .notNull()
      .references(() => user.id),
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
    userId: d
      .text()
      .notNull()
      .references(() => user.id),
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

export const platformSettings = createTable(
  "platform_settings",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    platformName: d
      .varchar({ length: 128 })
      .notNull()
      .default("Modern E-Learning Portal"),
    supportEmail: d
      .varchar({ length: 255 })
      .notNull()
      .default("support@modern-elearning-portal.local"),
    defaultCourseCapacity: d.integer().notNull().default(100),
    defaultEnrollmentMode: settingsEnrollmentModeEnum("default_enrollment_mode")
      .notNull()
      .default("open"),
    digestFrequency: settingsDigestFrequencyEnum("digest_frequency")
      .notNull()
      .default("daily"),
    sendSystemAnnouncements: d.boolean().notNull().default(true),
    maintenanceMode: d.boolean().notNull().default(false),
    maintenanceMessage: d
      .text()
      .notNull()
      .default(
        "Platform maintenance is in progress. Please check back shortly.",
      ),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  }),
  (t) => [index("platform_settings_created_idx").on(t.createdAt)],
);

// ─── Relations ────────────────────────────────────────────────────────────────
// Enables Drizzle's relational query API (`db.query.<table>.findMany({ with: {...} })`)
// alongside the existing hand-written joins used throughout the routers.

export const userRelations = relations(user, ({ many }) => ({
  courses: many(courses),
  enrollments: many(enrollments),
  grades: many(grades),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  category: one(categories, {
    fields: [courses.categoryId],
    references: [categories.id],
  }),
  teacher: one(user, {
    fields: [courses.teacherId],
    references: [user.id],
  }),
  sections: many(courseSections),
  sessions: many(courseSessions),
  gradeCategories: many(gradeCategories),
  enrollments: many(enrollments),
  announcements: many(announcements),
}));

export const courseSectionsRelations = relations(
  courseSections,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [courseSections.courseId],
      references: [courses.id],
    }),
    activities: many(activities),
  }),
);

export const courseSessionsRelations = relations(courseSessions, ({ one }) => ({
  course: one(courses, {
    fields: [courseSessions.courseId],
    references: [courses.id],
  }),
}));

export const gradeCategoriesRelations = relations(
  gradeCategories,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [gradeCategories.courseId],
      references: [courses.id],
    }),
    activities: many(activities),
    grades: many(grades),
  }),
);

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  section: one(courseSections, {
    fields: [activities.sectionId],
    references: [courseSections.id],
  }),
  gradeCategory: one(gradeCategories, {
    fields: [activities.gradeCategoryId],
    references: [gradeCategories.id],
  }),
  grades: many(grades),
  fileResource: one(fileResources, {
    fields: [activities.id],
    references: [fileResources.activityId],
  }),
  lessonNode: one(lessonNodes, {
    fields: [activities.id],
    references: [lessonNodes.activityId],
  }),
  page: one(pages, {
    fields: [activities.id],
    references: [pages.activityId],
  }),
  quiz: one(quizzes, {
    fields: [activities.id],
    references: [quizzes.activityId],
  }),
  textMediaBlock: one(textMediaBlocks, {
    fields: [activities.id],
    references: [textMediaBlocks.activityId],
  }),
  urlResource: one(urlResources, {
    fields: [activities.id],
    references: [urlResources.activityId],
  }),
  workshop: one(workshops, {
    fields: [activities.id],
    references: [workshops.activityId],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  user: one(user, {
    fields: [enrollments.userId],
    references: [user.id],
  }),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  activity: one(activities, {
    fields: [grades.activityId],
    references: [activities.id],
  }),
  user: one(user, {
    fields: [grades.userId],
    references: [user.id],
  }),
  gradeCategory: one(gradeCategories, {
    fields: [grades.gradeCategoryId],
    references: [gradeCategories.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  activity: one(activities, {
    fields: [quizzes.activityId],
    references: [activities.id],
  }),
  questions: many(quizQuestions),
}));

export const quizQuestionsRelations = relations(
  quizQuestions,
  ({ one, many }) => ({
    quiz: one(quizzes, {
      fields: [quizQuestions.quizActivityId],
      references: [quizzes.activityId],
    }),
    answers: many(quizAnswers),
  }),
);

export const quizAttemptsRelations = relations(
  quizAttempts,
  ({ one, many }) => ({
    quiz: one(quizzes, {
      fields: [quizAttempts.quizActivityId],
      references: [quizzes.activityId],
    }),
    user: one(user, {
      fields: [quizAttempts.userId],
      references: [user.id],
    }),
    answers: many(quizAnswers),
  }),
);

export const quizAnswersRelations = relations(quizAnswers, ({ one }) => ({
  attempt: one(quizAttempts, {
    fields: [quizAnswers.attemptId],
    references: [quizAttempts.id],
  }),
  question: one(quizQuestions, {
    fields: [quizAnswers.questionId],
    references: [quizQuestions.id],
  }),
}));

export const wikiPagesRelations = relations(wikiPages, ({ one, many }) => ({
  activity: one(activities, {
    fields: [wikiPages.activityId],
    references: [activities.id],
  }),
  author: one(user, {
    fields: [wikiPages.authorId],
    references: [user.id],
  }),
  revisions: many(wikiRevisions),
}));

export const wikiRevisionsRelations = relations(wikiRevisions, ({ one }) => ({
  wikiPage: one(wikiPages, {
    fields: [wikiRevisions.wikiPageId],
    references: [wikiPages.id],
  }),
  author: one(user, {
    fields: [wikiRevisions.authorId],
    references: [user.id],
  }),
}));

export const workshopsRelations = relations(workshops, ({ one, many }) => ({
  activity: one(activities, {
    fields: [workshops.activityId],
    references: [activities.id],
  }),
  rubrics: many(workshopRubrics),
  submissions: many(workshopSubmissions),
}));

export const workshopRubricsRelations = relations(
  workshopRubrics,
  ({ one }) => ({
    workshop: one(workshops, {
      fields: [workshopRubrics.workshopActivityId],
      references: [workshops.activityId],
    }),
  }),
);

export const workshopSubmissionsRelations = relations(
  workshopSubmissions,
  ({ one, many }) => ({
    workshop: one(workshops, {
      fields: [workshopSubmissions.workshopActivityId],
      references: [workshops.activityId],
    }),
    user: one(user, {
      fields: [workshopSubmissions.userId],
      references: [user.id],
    }),
    assessments: many(workshopAssessments),
  }),
);

export const workshopAssessmentsRelations = relations(
  workshopAssessments,
  ({ one }) => ({
    submission: one(workshopSubmissions, {
      fields: [workshopAssessments.submissionId],
      references: [workshopSubmissions.id],
    }),
    assessor: one(user, {
      fields: [workshopAssessments.assessorId],
      references: [user.id],
    }),
  }),
);

export const announcementsRelations = relations(announcements, ({ one }) => ({
  course: one(courses, {
    fields: [announcements.courseId],
    references: [courses.id],
  }),
  author: one(user, {
    fields: [announcements.authorId],
    references: [user.id],
  }),
}));

export const messageThreadsRelations = relations(
  messageThreads,
  ({ one, many }) => ({
    course: one(courses, {
      fields: [messageThreads.courseId],
      references: [courses.id],
    }),
    creator: one(user, {
      fields: [messageThreads.createdBy],
      references: [user.id],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(messageThreads, {
    fields: [messages.threadId],
    references: [messageThreads.id],
  }),
  author: one(user, {
    fields: [messages.authorId],
    references: [user.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
}));

// ─── Type exports ─────────────────────────────────────────────────────────────
export type User = typeof user.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CourseSection = typeof courseSections.$inferSelect;
export type CourseSession = typeof courseSessions.$inferSelect;
export type NewCourseSession = typeof courseSessions.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type WorkshopSubmission = typeof workshopSubmissions.$inferSelect;
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type NewPlatformSettings = typeof platformSettings.$inferInsert;
