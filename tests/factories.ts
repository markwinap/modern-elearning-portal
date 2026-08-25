import { eq, inArray } from "drizzle-orm";
import { db } from "~/server/db";
import {
  activities,
  categories,
  courseSections,
  courses,
  enrollments,
  quizAnswers,
  quizAttempts,
  quizQuestions,
  quizzes,
  user,
  type UserRole,
} from "~/server/db/schema";

let userCounter = 0;
let courseCounter = 0;
let cachedTestCategoryId: number | null = null;

export async function getOrCreateTestCategory() {
  if (cachedTestCategoryId !== null) {
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, cachedTestCategoryId),
    });
    if (existing) return existing;
    cachedTestCategoryId = null;
  }
  const slug = "test-category";
  const existing = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
  if (existing) return existing;
  const [created] = await db
    .insert(categories)
    .values({ name: "Test Category", slug })
    .returning();
  if (!created) throw new Error("Failed to create test category");
  cachedTestCategoryId = created.id;
  return created;
}

export async function createTestUser(
  overrides: Partial<{
    role: UserRole;
    name: string;
    email: string;
  }> = {},
) {
  userCounter++;
  const id = crypto.randomUUID();
  const role = overrides.role ?? "student";
  const name = overrides.name ?? `Test ${role} ${userCounter}`;
  const email =
    overrides.email ??
    `test-${role}-${userCounter}-${crypto.randomUUID()}@modern-elearning-portal.local`;

  const [created] = await db
    .insert(user)
    .values({
      id,
      name,
      email,
      role,
      emailVerified: true,
    })
    .returning();
  if (!created) throw new Error("Failed to create test user");
  return created;
}

export async function createTestCourse(
  teacherId: string,
  overrides: Partial<{
    title: string;
    categoryId: number;
    locationType: "online" | "onsite";
  }> = {},
) {
  courseCounter++;
  const categoryId =
    overrides.categoryId ?? (await getOrCreateTestCategory()).id;
  const [created] = await db
    .insert(courses)
    .values({
      title: overrides.title ?? `Test Course ${courseCounter}`,
      slug: `test-course-${courseCounter}-${Date.now()}`,
      description: "A course created for testing.",
      categoryId,
      locationType: overrides.locationType ?? "online",
      teacherId,
      status: "published",
    })
    .returning();
  if (!created) throw new Error("Failed to create test course");
  return created;
}

export async function createTestSection(
  courseId: number,
  overrides: Partial<{ title: string; order: number }> = {},
) {
  const [created] = await db
    .insert(courseSections)
    .values({
      courseId,
      title: overrides.title ?? "Test Section",
      order: overrides.order ?? 0,
    })
    .returning();
  if (!created) throw new Error("Failed to create test section");
  return created;
}

export async function createTestActivity(
  sectionId: number,
  type: "quiz" | "page" | "lesson" | "file" | "text_media" | "url" = "quiz",
  overrides: Partial<{
    title: string;
    gradable: boolean;
    completionType: "view" | "submit" | "grade" | "time";
  }> = {},
) {
  const completionType =
    overrides.completionType ?? (type === "quiz" ? "grade" : "view");
  const [created] = await db
    .insert(activities)
    .values({
      sectionId,
      title: overrides.title ?? `Test ${type}`,
      type,
      gradable: type === "quiz" ? true : false,
      completionType,
    })
    .returning();
  if (!created) throw new Error("Failed to create test activity");
  return created;
}

export async function createTestQuizConfig(
  activityId: number,
  overrides: Partial<{
    maxAttempts: number;
    showFeedback: boolean;
    feedbackMode:
      | "immediate"
      | "after_last_attempt"
      | "after_due_date"
      | "never";
  }> = {},
) {
  const [created] = await db
    .insert(quizzes)
    .values({
      activityId,
      maxAttempts: overrides.maxAttempts,
      showFeedback: overrides.showFeedback ?? true,
      feedbackMode: overrides.feedbackMode ?? "immediate",
      oneQuestionAtATime: false,
      shuffleQuestions: false,
      shuffleAnswers: false,
      questionsPerAttempt: null,
    })
    .returning();
  if (!created) throw new Error("Failed to create test quiz config");
  return created;
}

export async function createTestMultipleChoiceQuestion(
  quizActivityId: number,
  options: string[],
  correctAnswer: string,
  overrides: Partial<{
    prompt: string;
    points: number;
    order: number;
    allowMultiple: boolean;
  }> = {},
) {
  const [created] = await db
    .insert(quizQuestions)
    .values({
      quizActivityId,
      type: "multiple_choice",
      prompt: overrides.prompt ?? "Test question",
      options,
      correctAnswer,
      points: overrides.points ?? 1,
      order: overrides.order ?? 0,
      allowMultiple: overrides.allowMultiple ?? false,
      recommendedTimeMins: 1,
    })
    .returning();
  if (!created) throw new Error("Failed to create test question");
  return created;
}

export async function createTestEnrollment(
  studentId: string,
  courseId: number,
  status: "pending" | "active" | "rejected" = "active",
) {
  const [created] = await db
    .insert(enrollments)
    .values({
      courseId,
      userId: studentId,
      role: "student",
      status,
    })
    .returning();
  if (!created) throw new Error("Failed to create test enrollment");
  return created;
}

export async function deleteTestUsers(userIds: string[]) {
  if (userIds.length === 0) return;
  await db.delete(user).where(inArray(user.id, userIds));
}

export async function deleteTestCourses(courseIds: number[]) {
  if (courseIds.length === 0) return;

  const sections = await db
    .select({ id: courseSections.id })
    .from(courseSections)
    .where(inArray(courseSections.courseId, courseIds));
  const sectionIds = sections.map((s) => s.id);

  const activitiesRows = sectionIds.length
    ? await db
        .select({ id: activities.id })
        .from(activities)
        .where(inArray(activities.sectionId, sectionIds))
    : [];
  const activityIds = activitiesRows.map((a) => a.id);

  if (activityIds.length) {
    const attempts = await db
      .select({ id: quizAttempts.id })
      .from(quizAttempts)
      .where(inArray(quizAttempts.quizActivityId, activityIds));
    const attemptIds = attempts.map((a) => a.id);

    if (attemptIds.length) {
      await db
        .delete(quizAnswers)
        .where(inArray(quizAnswers.attemptId, attemptIds));
    }
    await db
      .delete(quizAttempts)
      .where(inArray(quizAttempts.quizActivityId, activityIds));
    await db
      .delete(quizQuestions)
      .where(inArray(quizQuestions.quizActivityId, activityIds));
    await db.delete(quizzes).where(inArray(quizzes.activityId, activityIds));
  }

  await db.delete(activities).where(inArray(activities.sectionId, sectionIds));
  await db
    .delete(courseSections)
    .where(inArray(courseSections.courseId, courseIds));
  await db.delete(enrollments).where(inArray(enrollments.courseId, courseIds));
  await db.delete(courses).where(inArray(courses.id, courseIds));
}
