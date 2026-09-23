// @vitest-environment node

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";
import { gamificationConfig } from "~/server/db/schema";
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

describe("gamification engine", () => {
  const resourceIds = {
    users: [] as string[],
    courses: [] as number[],
  };

  beforeEach(async () => {
    await db.delete(gamificationConfig);
  });

  afterEach(async () => {
    await db.delete(gamificationConfig);
  });

  afterAll(async () => {
    await deleteTestCourses(resourceIds.courses);
    await deleteTestUsers(resourceIds.users);
  });

  it("awards points and badges for completing an activity", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);
    await createTestEnrollment(student.id, course.id, "active");

    const section = await createTestSection(course.id);
    const activity = await createTestActivity(section.id, "page", {
      title: "Gamification Activity",
    });

    const caller = createCaller({
      db,
      session: createTestSession({
        id: student.id,
        name: student.name,
        email: student.email,
        role: "student",
      }),
      headers: new Headers(),
    });

    await caller.progress.markActivity({
      activityId: activity.id,
      status: "completed",
      timeSpentSecs: 60,
    });

    const status = await caller.gamification.getMyStatus();
    // The single activity in the course also completes the whole course.
    expect(status.points).toBe(10 + 100);
    expect(status.level).toBe(2);
    expect(status.badges.some((b) => b.key === "first_steps")).toBe(true);
    expect(status.badges.some((b) => b.key === "course_graduate")).toBe(true);
  }, 20_000);

  it("awards points for passing a quiz", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);
    await createTestEnrollment(student.id, course.id, "active");

    const section = await createTestSection(course.id);
    const activity = await createTestActivity(section.id, "quiz", {
      title: "Gamification Quiz",
    });
    await createTestQuizConfig(activity.id, { maxAttempts: 1 });
    const question = await createTestMultipleChoiceQuestion(
      activity.id,
      ["A", "B", "C"],
      "A",
    );

    const caller = createCaller({
      db,
      session: createTestSession({
        id: student.id,
        name: student.name,
        email: student.email,
        role: "student",
      }),
      headers: new Headers(),
    });

    const attempt = await caller.quiz.startAttempt({
      activityId: activity.id,
    });
    if (!attempt) throw new Error("Failed to start quiz attempt");

    await caller.quiz.submitAttempt({
      attemptId: attempt.id,
      answers: [{ questionId: question.id, answer: "A" }],
    });

    const status = await caller.gamification.getMyStatus();
    expect(status.points).toBe(25);
  }, 20_000);

  it("awards course completion points when all activities are completed", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);
    await createTestEnrollment(student.id, course.id, "active");

    const section = await createTestSection(course.id);
    const activity = await createTestActivity(section.id, "page");

    const caller = createCaller({
      db,
      session: createTestSession({
        id: student.id,
        name: student.name,
        email: student.email,
        role: "student",
      }),
      headers: new Headers(),
    });

    await caller.progress.markActivity({
      activityId: activity.id,
      status: "completed",
      timeSpentSecs: 30,
    });

    const status = await caller.gamification.getMyStatus();
    expect(status.points).toBe(10 + 100);
    expect(status.badges.some((b) => b.key === "course_graduate")).toBe(true);
  }, 20_000);

  it("tracks streaks on daily login", async () => {
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(student.id);

    const caller = createCaller({
      db,
      session: createTestSession({
        id: student.id,
        name: student.name,
        email: student.email,
        role: "student",
      }),
      headers: new Headers(),
    });

    await caller.gamification.recordDailyLogin();

    const status = await caller.gamification.getMyStatus();
    expect(status.points).toBe(5);
    expect(status.currentStreak).toBe(1);
    expect(status.longestStreak).toBe(1);
  }, 20_000);

  it("displays ranked learners on the leaderboard", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const alice = await createTestUser({
      role: "student",
      name: "Alice",
      email: `alice-${crypto.randomUUID()}@modern-elearning-portal.local`,
    });
    const bob = await createTestUser({
      role: "student",
      name: "Bob",
      email: `bob-${crypto.randomUUID()}@modern-elearning-portal.local`,
    });
    resourceIds.users.push(teacher.id, alice.id, bob.id);

    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);
    await createTestEnrollment(alice.id, course.id, "active");
    await createTestEnrollment(bob.id, course.id, "active");

    const section = await createTestSection(course.id);
    const activity1 = await createTestActivity(section.id, "page", {
      title: "Leaderboard Activity 1",
    });
    const activity2 = await createTestActivity(section.id, "page", {
      title: "Leaderboard Activity 2",
    });

    const aliceCaller = createCaller({
      db,
      session: createTestSession({
        id: alice.id,
        name: alice.name,
        email: alice.email,
        role: "student",
      }),
      headers: new Headers(),
    });

    const bobCaller = createCaller({
      db,
      session: createTestSession({
        id: bob.id,
        name: bob.name,
        email: bob.email,
        role: "student",
      }),
      headers: new Headers(),
    });

    await aliceCaller.progress.markActivity({
      activityId: activity1.id,
      status: "completed",
      timeSpentSecs: 30,
    });

    await bobCaller.progress.markActivity({
      activityId: activity1.id,
      status: "completed",
      timeSpentSecs: 30,
    });
    await bobCaller.progress.markActivity({
      activityId: activity2.id,
      status: "completed",
      timeSpentSecs: 30,
    });

    const adminCaller = createCaller({
      db,
      session: createTestSession({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: "admin",
      }),
      headers: new Headers(),
    });

    await adminCaller.gamification.refreshLeaderboard({
      scope: "course",
      courseId: course.id,
    });

    const leaderboard = await aliceCaller.gamification.getLeaderboard({
      scope: "course",
      courseId: course.id,
    });
    expect(leaderboard.entries.length).toBe(2);
    expect(leaderboard.entries[0]?.name).toBe("Bob");
    expect(leaderboard.entries[0]?.points).toBeGreaterThan(
      leaderboard.entries[1]?.points ?? 0,
    );
  }, 20_000);

  it("applies updated point values to new events", async () => {
    const admin = await createTestUser({ role: "admin" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(admin.id, student.id);

    const adminCaller = createCaller({
      db,
      session: createTestSession({
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      }),
      headers: new Headers(),
    });

    await adminCaller.gamification.updateConfig({
      activityCompletedPoints: 42,
      quizPassedPoints: 25,
      courseCompletedPoints: 100,
      dailyLoginPoints: 5,
      levelThresholds: [0, 100, 250, 500, 1000, 2000],
    });

    const teacher = await createTestUser({ role: "teacher" });
    resourceIds.users.push(teacher.id);

    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);
    await createTestEnrollment(student.id, course.id, "active");

    const section = await createTestSection(course.id);
    const activity = await createTestActivity(section.id, "page");

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

    await studentCaller.progress.markActivity({
      activityId: activity.id,
      status: "completed",
      timeSpentSecs: 30,
    });

    const status = await studentCaller.gamification.getMyStatus();
    // Custom activity points + automatic course completion points.
    expect(status.points).toBe(42 + 100);
  }, 20_000);
});
