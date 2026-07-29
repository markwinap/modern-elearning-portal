import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { type db } from "~/server/db";
import {
  activities,
  courses,
  courseSections,
  gradeCategories,
} from "~/server/db/schema";

/** Get courseId from an activity via its section */
type DB = typeof db;
async function getCourseIdFromActivity(database: DB, activityId: number) {
  const [row] = await database
    .select({ courseId: courseSections.courseId })
    .from(activities)
    .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
    .where(eq(activities.id, activityId))
    .limit(1);
  return row?.courseId ?? null;
}

export const activityRouter = createTRPCRouter({
  listBySection: protectedProcedure
    .input(z.object({ sectionId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(activities)
        .where(eq(activities.sectionId, input.sectionId))
        .orderBy(asc(activities.order));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [activity] = await ctx.db
        .select()
        .from(activities)
        .where(eq(activities.id, input.id))
        .limit(1);
      if (!activity) throw new TRPCError({ code: "NOT_FOUND" });
      return activity;
    }),

  create: teacherProcedure
    .input(
      z.object({
        sectionId: z.number().int(),
        title: z.string().min(1).max(256),
        type: z.enum([
          "lesson",
          "quiz",
          "page",
          "file",
          "url",
          "text_media",
          "wiki",
          "workshop",
        ]),
        order: z.number().int().default(0),
        completionType: z
          .enum(["view", "submit", "grade", "time"])
          .default("view"),
        completionGrade: z.number().int().optional(),
        completionTimeSecs: z.number().int().optional(),
        gradable: z.boolean().default(true).optional(),
        gradeCategoryId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [section] = await ctx.db
        .select({ courseId: courseSections.courseId })
        .from(courseSections)
        .where(eq(courseSections.id, input.sectionId))
        .limit(1);
      if (!section) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, section.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);

      if (
        input.gradeCategoryId !== undefined &&
        input.gradeCategoryId !== null
      ) {
        const [category] = await ctx.db
          .select({ id: gradeCategories.id })
          .from(gradeCategories)
          .where(
            and(
              eq(gradeCategories.id, input.gradeCategoryId),
              eq(gradeCategories.courseId, section.courseId),
            ),
          )
          .limit(1);
        if (!category) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Grade category not found for this course",
          });
        }
      }

      const [activity] = await ctx.db
        .insert(activities)
        .values(input)
        .returning();
      return activity;
    }),

  update: teacherProcedure
    .input(
      z.object({
        id: z.number().int(),
        title: z.string().min(1).max(256).optional(),
        order: z.number().int().optional(),
        visible: z.boolean().optional(),
        completionType: z.enum(["view", "submit", "grade", "time"]).optional(),
        completionGrade: z.number().int().nullable().optional(),
        completionTimeSecs: z.number().int().nullable().optional(),
        gradable: z.boolean().optional(),
        gradeCategoryId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const courseId = await getCourseIdFromActivity(ctx.db, id);
      if (!courseId) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);

      if (data.gradeCategoryId !== undefined && data.gradeCategoryId !== null) {
        const [category] = await ctx.db
          .select({ id: gradeCategories.id })
          .from(gradeCategories)
          .where(
            and(
              eq(gradeCategories.id, data.gradeCategoryId),
              eq(gradeCategories.courseId, courseId),
            ),
          )
          .limit(1);
        if (!category) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Grade category not found for this course",
          });
        }
      }

      await ctx.db.update(activities).set(data).where(eq(activities.id, id));
    }),

  delete: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const courseId = await getCourseIdFromActivity(ctx.db, input.id);
      if (!courseId) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
      await ctx.db.delete(activities).where(eq(activities.id, input.id));
    }),
});
