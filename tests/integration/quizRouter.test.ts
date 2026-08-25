// @vitest-environment node

import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  createTestActivity,
  createTestCourse,
  createTestEnrollment,
  createTestMultipleChoiceQuestion,
  createTestQuizConfig,
  createTestSection,
  createTestUser,
  deleteTestCourses,
  deleteTestUsers,
} from "../factories";
import { createTestSession } from "../helpers";

const createCaller = createCallerFactory(appRouter);

describe("quizRouter integration", () => {
  const resourceIds = {
    users: [] as string[],
    courses: [] as number[],
  };

  afterAll(async () => {
    await deleteTestCourses(resourceIds.courses);
    await deleteTestUsers(resourceIds.users);
  });

  it("creates a question and a student can attempt and submit it", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);
    const section = await createTestSection(course.id);
    const activity = await createTestActivity(section.id, "quiz");
    await createTestQuizConfig(activity.id, { maxAttempts: undefined });
    const question = await createTestMultipleChoiceQuestion(
      activity.id,
      ["A", "B", "C"],
      "B",
      { points: 5 },
    );
    await createTestEnrollment(student.id, course.id);

    const studentCaller = createCaller({
      db,
      session: createTestSession({
        id: student.id,
        name: student.name,
        email: student.email,
        role: "student",
      }),
      headers: new Headers(),
    });

    const attempt = await studentCaller.quiz.startAttempt({
      activityId: activity.id,
    });
    if (!attempt) throw new Error("startAttempt returned undefined");
    expect(attempt.quizActivityId).toBe(activity.id);

    const result = await studentCaller.quiz.submitAttempt({
      attemptId: attempt.id,
      answers: [{ questionId: question.id, answer: "B" }],
    });
    expect(result.score).toBe(5);
    expect(result.maxScore).toBe(5);
  }, 15000);

  it("rejects invalid question payloads at the input boundary", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    resourceIds.users.push(teacher.id);

    const teacherCaller = createCaller({
      db,
      session: createTestSession({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: "teacher",
      }),
      headers: new Headers(),
    });

    await expect(
      teacherCaller.quiz.createQuestion({
        quizActivityId: 999999,
        type: "multiple_choice",
        prompt: "Bad question",
        options: [],
        correctAnswer: "A",
        points: 1,
        order: 0,
      }),
    ).rejects.toThrow();
  });
});
