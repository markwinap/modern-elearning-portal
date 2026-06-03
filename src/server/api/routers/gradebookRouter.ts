import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { activities, courses, courseSections, gradeCategories, grades } from "~/server/db/schema";

export const gradebookRouter = createTRPCRouter({
  /** Get all grades for a student in a course. */
  getMyGrades: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      // Get activity IDs for this course
      const courseActivities = await ctx.db
        .select({ id: activities.id })
        .from(activities)
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .where(eq(courseSections.courseId, input.courseId));
      const activityIds = courseActivities.map((a) => a.id);
      if (activityIds.length === 0) return [];

      return ctx.db
        .select()
        .from(grades)
        .where(and(eq(grades.userId, ctx.session.user.id)))
        .orderBy(desc(grades.gradedAt));
    }),

  /** Get grades for all students in a course (teacher view). */
  getCourseGrades: teacherProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      const role = ctx.session.user.role as string | undefined;
      if (course?.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const courseActivities = await ctx.db
        .select({ id: activities.id })
        .from(activities)
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .where(eq(courseSections.courseId, input.courseId));
      if (courseActivities.length === 0) return [];

      return ctx.db.select().from(grades).orderBy(desc(grades.gradedAt));
    }),

  /** Submit a grade (teacher). */
  submitGrade: teacherProcedure
    .input(
      z.object({
        activityId: z.number().int(),
        userId: z.string(),
        rawScore: z.number().min(0),
        maxScore: z.number().min(0),
        feedback: z.string().optional(),
        gradeCategoryId: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const percentage = input.maxScore > 0 ? (input.rawScore / input.maxScore) * 100 : 0;
      const [grade] = await ctx.db
        .insert(grades)
        .values({
          activityId: input.activityId,
          userId: input.userId,
          rawScore: input.rawScore,
          maxScore: input.maxScore,
          percentage,
          feedback: input.feedback,
          gradeCategoryId: input.gradeCategoryId,
          gradedAt: new Date(),
          gradedById: ctx.session.user.id,
        })
        .onConflictDoUpdate({
          target: [grades.activityId, grades.userId],
          set: {
            rawScore: input.rawScore,
            maxScore: input.maxScore,
            percentage,
            feedback: input.feedback,
            gradedAt: new Date(),
            gradedById: ctx.session.user.id,
          },
        })
        .returning();
      return grade;
    }),

  /** List grade categories for a course. */
  listCategories: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(gradeCategories)
        .where(eq(gradeCategories.courseId, input.courseId))
        .orderBy(gradeCategories.order);
    }),

  /** Create a grade category (teacher). */
  createCategory: teacherProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        name: z.string().min(1).max(128),
        weight: z.number().min(0).max(100).optional(),
        order: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [cat] = await ctx.db.insert(gradeCategories).values(input).returning();
      return cat;
    }),
});
