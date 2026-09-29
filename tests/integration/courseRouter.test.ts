// @vitest-environment node

import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";
import { activities, courses, courseSections } from "~/server/db/schema";
import {
  createTestActivity,
  createTestCourse,
  createTestSection,
  createTestUser,
  deleteTestCourses,
  deleteTestUsers,
  getOrCreateTestCategory,
} from "../factories";
import { createTestSession } from "../helpers";

const createCaller = createCallerFactory(appRouter);

describe("courseRouter integration", () => {
  const resourceIds = {
    users: [] as string[],
    courses: [] as number[],
  };

  afterAll(async () => {
    await deleteTestCourses(resourceIds.courses);
    await deleteTestUsers(resourceIds.users);
  });

  it("lists published courses publicly", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    resourceIds.users.push(teacher.id);
    const course = await createTestCourse(teacher.id);
    resourceIds.courses.push(course.id);

    const caller = createCaller({
      db,
      session: null,
      headers: new Headers(),
    });

    const result = await caller.course.list({ page: 1, limit: 10 });
    expect(result.some((c) => c.id === course.id)).toBe(true);
  });

  it("allows teachers to create and update courses", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    resourceIds.users.push(teacher.id);

    const caller = createCaller({
      db,
      session: createTestSession({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: "teacher",
      }),
      headers: new Headers(),
    });

    const category = await getOrCreateTestCategory();
    const created = await caller.course.create({
      title: "Teacher Created Course",
      categoryId: category.id,
      locationType: "online",
    });
    if (!created) throw new Error("Course create returned undefined");
    expect(created.title).toBe("Teacher Created Course");
    resourceIds.courses.push(created.id);

    await caller.course.update({
      id: created.id,
      title: "Updated Title",
      categoryId: category.id,
      locationType: "online",
    });
    const fetched = await caller.course.getBySlug({ slug: created.slug });
    expect(fetched?.title).toBe("Updated Title");
  });

  it("deletes owned draft courses and their child content", async () => {
    const teacher = await createTestUser({ role: "teacher" });
    resourceIds.users.push(teacher.id);
    const course = await createTestCourse(teacher.id, { status: "draft" });
    resourceIds.courses.push(course.id);
    const section = await createTestSection(course.id);
    const activity = await createTestActivity(section.id, "page");

    const caller = createCaller({
      db,
      session: createTestSession({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: "teacher",
      }),
      headers: new Headers(),
    });

    await caller.course.deleteDraft({ id: course.id });

    const [deletedCourse, deletedSection, deletedActivity] = await Promise.all([
      db.query.courses.findFirst({ where: eq(courses.id, course.id) }),
      db.query.courseSections.findFirst({
        where: eq(courseSections.id, section.id),
      }),
      db.query.activities.findFirst({ where: eq(activities.id, activity.id) }),
    ]);
    expect(deletedCourse).toBeUndefined();
    expect(deletedSection).toBeUndefined();
    expect(deletedActivity).toBeUndefined();
  });

  it("rejects deletion of published courses and drafts owned by another teacher", async () => {
    const [owner, otherTeacher] = await Promise.all([
      createTestUser({ role: "teacher" }),
      createTestUser({ role: "teacher" }),
    ]);
    resourceIds.users.push(owner.id, otherTeacher.id);
    const [publishedCourse, draftCourse] = await Promise.all([
      createTestCourse(owner.id),
      createTestCourse(owner.id, { status: "draft" }),
    ]);
    resourceIds.courses.push(publishedCourse.id, draftCourse.id);

    const ownerCaller = createCaller({
      db,
      session: createTestSession({
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: "teacher",
      }),
      headers: new Headers(),
    });
    const otherCaller = createCaller({
      db,
      session: createTestSession({
        id: otherTeacher.id,
        name: otherTeacher.name,
        email: otherTeacher.email,
        role: "teacher",
      }),
      headers: new Headers(),
    });

    await expect(
      ownerCaller.course.deleteDraft({ id: publishedCourse.id }),
    ).rejects.toThrow("Only draft courses can be deleted");
    await expect(
      otherCaller.course.deleteDraft({ id: draftCourse.id }),
    ).rejects.toThrow();
  });

  it("prevents students from creating courses", async () => {
    const student = await createTestUser({ role: "student" });
    const category = await getOrCreateTestCategory();
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

    await expect(
      caller.course.create({
        title: "Student Course",
        categoryId: category.id,
        locationType: "online",
      }),
    ).rejects.toThrow("Teacher access required");
  });
});
