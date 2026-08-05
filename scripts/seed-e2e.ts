import "dotenv/config";

import { writeFileSync } from "node:fs";

import { and, eq } from "drizzle-orm";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import {
  activities,
  categories,
  courseSections,
  courses,
  enrollments,
  quizzes,
  quizQuestions,
  user,
} from "~/server/db/schema";

async function getOrCreateUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}) {
  const existing = await db.select().from(user).where(eq(user.email, email));
  if (existing[0]) {
    return existing[0];
  }

  // signUpEmail may or may not return the user depending on better-auth version,
  // so we ignore the result and query afterwards.
  try {
    await auth.api.signUpEmail({
      body: { name, email, password },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("user already exists")) {
      // noop — fall through and fetch the existing row
    } else {
      throw error;
    }
  }

  const after = await db.select().from(user).where(eq(user.email, email));
  if (!after[0]) {
    throw new Error(`User ${email} not found after sign-up`);
  }
  return after[0];
}

async function main() {
  const teacherEmail = process.env.E2E_TEACHER_EMAIL;
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD;
  const studentEmail = process.env.E2E_STUDENT_EMAIL;
  const studentPassword = process.env.E2E_STUDENT_PASSWORD;

  if (!teacherEmail || !teacherPassword || !studentEmail || !studentPassword) {
    throw new Error(
      "E2E_TEACHER_EMAIL, E2E_TEACHER_PASSWORD, E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD must be set in .env",
    );
  }

  console.log("Creating E2E users...");
  const teacher = await getOrCreateUser({
    name: "E2E Teacher",
    email: teacherEmail,
    password: teacherPassword,
  });
  const student = await getOrCreateUser({
    name: "E2E Student",
    email: studentEmail,
    password: studentPassword,
  });

  await db
    .update(user)
    .set({ role: "teacher", emailVerified: true })
    .where(eq(user.id, teacher.id));
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.id, student.id));

  console.log("Creating E2E course, section, quiz and questions...");

  const [category] = await db
    .insert(categories)
    .values({
      name: "E2E Category",
      slug: "e2e-category",
      description: "Seeded for E2E tests",
    })
    .onConflictDoNothing({ target: categories.slug })
    .returning();
  const categoryRow =
    category ??
    (
      await db
        .select()
        .from(categories)
        .where(eq(categories.slug, "e2e-category"))
    )[0];
  if (!categoryRow) {
    throw new Error("Failed to seed category");
  }

  const [course] = await db
    .insert(courses)
    .values({
      title: "E2E Quiz Course",
      slug: "e2e-quiz-course",
      description: "Seeded for E2E tests",
      categoryId: categoryRow.id,
      teacherId: teacher.id,
      status: "published",
      locationType: "online",
    })
    .onConflictDoNothing({ target: courses.slug })
    .returning();
  const courseRow =
    course ??
    (
      await db.select().from(courses).where(eq(courses.slug, "e2e-quiz-course"))
    )[0];
  if (!courseRow) {
    throw new Error("Failed to seed course");
  }

  const existingSection = await db
    .select()
    .from(courseSections)
    .where(
      and(
        eq(courseSections.courseId, courseRow.id),
        eq(courseSections.title, "Section 1"),
      ),
    );
  const sectionRow =
    existingSection[0] ??
    (
      await db
        .insert(courseSections)
        .values({
          courseId: courseRow.id,
          title: "Section 1",
          order: 1,
          visible: true,
          gradable: true,
          durationMins: 0,
          durationMode: "manual",
        })
        .returning()
    )[0];
  if (!sectionRow) {
    throw new Error("Failed to seed section");
  }

  const existingActivity = await db
    .select()
    .from(activities)
    .where(
      and(
        eq(activities.sectionId, sectionRow.id),
        eq(activities.title, "E2E Quiz"),
      ),
    );
  const activityRow =
    existingActivity[0] ??
    (
      await db
        .insert(activities)
        .values({
          sectionId: sectionRow.id,
          type: "quiz",
          title: "E2E Quiz",
          order: 1,
          visible: true,
          gradable: true,
          completionType: "submit",
        })
        .returning()
    )[0];
  if (!activityRow) {
    throw new Error("Failed to seed activity");
  }

  await db
    .insert(quizzes)
    .values({
      activityId: activityRow.id,
      maxAttempts: 3,
      questionsPerAttempt: 2,
      oneQuestionAtATime: true,
      shuffleQuestions: false,
      shuffleAnswers: false,
      showFeedback: true,
      feedbackMode: "immediate",
    })
    .onConflictDoNothing({ target: quizzes.activityId });

  const existingQuestions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizActivityId, activityRow.id));

  if (existingQuestions.length === 0) {
    await db.insert(quizQuestions).values([
      {
        quizActivityId: activityRow.id,
        type: "true_false",
        prompt: "The sky is blue.",
        options: [],
        correctAnswer: true,
        points: 1,
        order: 1,
      },
      {
        quizActivityId: activityRow.id,
        type: "multiple_choice",
        prompt: "What is 2 + 2?",
        options: ["2", "3", "4", "5"],
        correctAnswer: "4",
        points: 1,
        order: 2,
      },
      {
        quizActivityId: activityRow.id,
        type: "multiple_choice",
        prompt: "What is the capital of France?",
        options: ["Berlin", "Madrid", "Paris", "Rome"],
        correctAnswer: "Paris",
        points: 1,
        order: 3,
      },
    ]);
  }

  const existingEnrollment = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, courseRow.id),
        eq(enrollments.userId, student.id),
      ),
    );
  if (existingEnrollment.length === 0) {
    await db.insert(enrollments).values({
      courseId: courseRow.id,
      userId: student.id,
      role: "student",
      status: "active",
    });
  }

  const fixture = {
    courseId: courseRow.id,
    courseSlug: courseRow.slug,
    activityId: activityRow.id,
  };
  writeFileSync("e2e/e2e-fixtures.json", JSON.stringify(fixture, null, 2));

  console.log("E2E seed complete.");
  console.log(`  Course id: ${courseRow.id}`);
  console.log(`  Activity id: ${activityRow.id}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
