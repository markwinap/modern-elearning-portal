// @vitest-environment node

import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  createTestActivity,
  createTestCourse,
  createTestEnrollment,
  createTestSection,
  createTestUser,
  deleteTestCourses,
  deleteTestUsers,
} from "../factories";
import { createTestSession } from "../helpers";

const createCaller = createCallerFactory(appRouter);

describe("dashboard and search integration", () => {
  const resourceIds = {
    users: [] as string[],
    courses: [] as number[],
  };

  afterAll(async () => {
    await deleteTestCourses(resourceIds.courses);
    await deleteTestUsers(resourceIds.users);
  });

  it("returns personalized learner dashboard data", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const course = await createTestCourse(teacher.id, {
      title: "Dashboard Test Course",
      description: "A course for testing the learner dashboard.",
    });
    resourceIds.courses.push(course.id);

    const enrollment = await createTestEnrollment(
      student.id,
      course.id,
      "active",
    );
    expect(enrollment.status).toBe("active");

    const section = await createTestSection(course.id, { title: "Unit 1" });
    const activity = await createTestActivity(section.id, "page", {
      title: "Intro Page",
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

    const home = await caller.dashboard.getLearnerHome();

    expect(home.continueLearning.length).toBeGreaterThan(0);
    expect(home.continueLearning[0]?.courseId).toBe(course.id);
    expect(home.recommendations.length).toBeGreaterThanOrEqual(0);
    expect(home.announcements.length).toBe(0);
    expect(home.upcomingDeadlines.length).toBe(0);

    await caller.progress.markActivity({
      activityId: activity.id,
      status: "completed",
      timeSpentSecs: 120,
    });

    const afterProgress = await caller.dashboard.getLearnerHome();
    expect(afterProgress.continueLearning[0]?.progressPct).toBe(100);
  }, 20_000);

  it("returns ranked full-text search results across content types", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const course = await createTestCourse(teacher.id, {
      title: "Astrophysics 101",
      description: "An introduction to the physics of space and stars.",
    });
    resourceIds.courses.push(course.id);
    await createTestEnrollment(student.id, course.id, "active");

    const section = await createTestSection(course.id);
    await createTestActivity(section.id, "quiz", { title: "Space Quiz" });

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

    const result = await caller.search.search({
      query: "space",
      page: 1,
      limit: 10,
    });

    expect(result.totalCount).toBeGreaterThanOrEqual(1);
    expect(result.results.some((r) => r.type === "course")).toBe(true);

    const ranked = [...result.results];
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i]?.rank).toBeLessThanOrEqual(ranked[i - 1]?.rank ?? 0);
    }
  });

  it("supports search type and category filters", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const course = await createTestCourse(teacher.id, {
      title: "Filtered Search Course",
      description: "Used to test filtering.",
    });
    resourceIds.courses.push(course.id);
    await createTestEnrollment(student.id, course.id, "active");

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

    const onlyActivities = await caller.search.search({
      query: "test filtering",
      types: ["activity"],
      page: 1,
      limit: 10,
    });
    expect(onlyActivities.results.every((r) => r.type === "activity")).toBe(
      true,
    );

    const byCategory = await caller.search.search({
      query: "Filtered",
      categoryId: course.categoryId,
      page: 1,
      limit: 10,
    });
    expect(byCategory.results.length).toBeGreaterThan(0);
    expect(byCategory.results.some((r) => r.courseSlug === course.slug)).toBe(
      true,
    );
  });
});
