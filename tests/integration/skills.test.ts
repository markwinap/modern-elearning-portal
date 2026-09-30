// @vitest-environment node

import { afterAll, describe, expect, it } from "vitest";
import { and, eq, sql } from "drizzle-orm";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  courseSkills,
  learningPaths,
  pathCourses,
  pathEnrollments,
  skills,
  userSkills,
} from "~/server/db/schema";
import {
  getPathProgress,
  getSkillGaps,
  updateUserSkillOnCourseCompletion,
} from "~/server/lib/skills";
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

describe("skills and learning paths", () => {
  const resourceIds = {
    users: [] as string[],
    courses: [] as number[],
  };

  afterAll(async () => {
    await db.delete(skills).where(sql`true`);
    await db.delete(learningPaths).where(sql`true`);
    await deleteTestCourses(resourceIds.courses);
    await deleteTestUsers(resourceIds.users);
  });

  it("awards skill points when a course is completed", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);
    await createTestEnrollment(student.id, course.id, "active");

    const [skill] = await db
      .insert(skills)
      .values({ name: "Critical Thinking" })
      .returning();
    if (!skill) throw new Error("Failed to create skill");
    await db
      .insert(courseSkills)
      .values({ courseId: course.id, skillId: skill.id, weight: 60 });

    await updateUserSkillOnCourseCompletion(db, student.id, course.id);

    const [userSkill] = await db
      .select()
      .from(userSkills)
      .where(
        and(
          eq(userSkills.userId, student.id),
          eq(userSkills.skillId, skill.id),
        ),
      );
    expect(userSkill).toBeDefined();
    expect(userSkill?.score).toBe(60);
  }, 20_000);

  it("identifies skill gaps and recommends mapped courses", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const [skill] = await db
      .insert(skills)
      .values({ name: "Communication" })
      .returning();
    if (!skill) throw new Error("Failed to create skill");
    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);
    resourceIds.users.push(teacher.id);
    await db
      .insert(courseSkills)
      .values({ courseId: course.id, skillId: skill.id, weight: 100 });

    const gaps = await getSkillGaps(db, "no-skill-user");
    const communicationGap = gaps.find((g) => g.skillId === skill.id);
    expect(communicationGap).toBeDefined();
    expect(communicationGap?.recommendedCourseIds).toContain(course.id);
  }, 20_000);

  it("computes path progress and respects prerequisites", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const courseA = await createTestCourse(teacher.id);
    const courseB = await createTestCourse(teacher.id);
    resourceIds.courses.push(courseA.id, courseB.id);

    const [path] = await db
      .insert(learningPaths)
      .values({ title: "Leadership track", status: "published" })
      .returning();
    if (!path) throw new Error("Failed to create path");
    await db.insert(pathCourses).values([
      { pathId: path.id, courseId: courseA.id, order: 0 },
      {
        pathId: path.id,
        courseId: courseB.id,
        order: 1,
        prerequisiteCourseId: courseA.id,
      },
    ]);

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

    await caller.learningPath.join({ pathId: path.id });

    const { steps } = await getPathProgress(db, path.id, student.id);
    expect(steps[0]?.isLocked).toBe(false);
    expect(steps[1]?.isLocked).toBe(true);

    const [enrollment] = await db
      .select()
      .from(pathEnrollments)
      .where(
        and(
          eq(pathEnrollments.pathId, path.id),
          eq(pathEnrollments.userId, student.id),
        ),
      );
    expect(enrollment).toBeDefined();

    await db.delete(pathEnrollments).where(sql`true`);
    await db.delete(pathCourses).where(sql`true`);
    await db.delete(learningPaths).where(sql`true`);
  }, 20_000);

  it("awards points on skill attainment via gamification event", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    const student = await createTestUser({ role: "student" });
    resourceIds.users.push(teacher.id, student.id);

    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);
    await createTestEnrollment(student.id, course.id, "active");

    const section = await createTestSection(course.id);
    const activity = await createTestActivity(section.id, "page", {
      title: "Skill activity",
    });

    const [skill] = await db
      .insert(skills)
      .values({ name: "Problem Solving" })
      .returning();
    if (!skill) throw new Error("Failed to create skill");
    await db
      .insert(courseSkills)
      .values({ courseId: course.id, skillId: skill.id, weight: 100 });

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
    expect(status.points).toBeGreaterThanOrEqual(20);
  }, 20_000);

  it("lets admins list all learning paths including drafts", async () => {
    const admin = await createTestUser({ role: "admin" });
    resourceIds.users.push(admin.id);

    const [draftPath] = await db
      .insert(learningPaths)
      .values({ title: "Draft path", status: "draft" })
      .returning();
    if (!draftPath) throw new Error("Failed to create path");

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

    const allPaths = await adminCaller.learningPath.listAll();
    expect(allPaths.some((p) => p.id === draftPath.id)).toBe(true);

    const publicPaths = await adminCaller.learningPath.list();
    expect(publicPaths.some((p) => p.id === draftPath.id)).toBe(false);

    await db.delete(learningPaths).where(eq(learningPaths.id, draftPath.id));
  }, 20_000);
});
