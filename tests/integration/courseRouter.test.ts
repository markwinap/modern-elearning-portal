// @vitest-environment node

import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  createTestCourse,
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
