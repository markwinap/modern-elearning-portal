import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  activities,
  courses,
  courseSections,
  quizQuestions,
} from "~/server/db/schema";

export const sectionRouter = createTRPCRouter({
  /** List all sections for a course. */
  listByCourse: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(courseSections)
        .where(eq(courseSections.courseId, input.courseId))
        .orderBy(asc(courseSections.order));
    }),

  create: teacherProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        order: z.number().int().default(0),
        gradable: z.boolean().default(true).optional(),
        durationMins: z.number().int().min(0).default(0),
        durationMode: z.enum(["manual", "auto"]).default("manual"),
        pickCount: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);
      const [section] = await ctx.db
        .insert(courseSections)
        .values(input)
        .returning();
      return section;
    }),

  update: teacherProcedure
    .input(
      z.object({
        id: z.number().int(),
        title: z.string().min(1).max(256).optional(),
        description: z.string().optional(),
        order: z.number().int().optional(),
        visible: z.boolean().optional(),
        gradable: z.boolean().optional(),
        durationMins: z.number().int().min(0).optional(),
        durationMode: z.enum(["manual", "auto"]).optional(),
        pickCount: z.number().int().min(0).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [section] = await ctx.db
        .select({ courseId: courseSections.courseId })
        .from(courseSections)
        .where(eq(courseSections.id, id))
        .limit(1);
      if (!section) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, section.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
      await ctx.db
        .update(courseSections)
        .set(data)
        .where(eq(courseSections.id, id));
    }),

  delete: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [section] = await ctx.db
        .select({ courseId: courseSections.courseId })
        .from(courseSections)
        .where(eq(courseSections.id, input.id))
        .limit(1);
      if (!section) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, section.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
      await ctx.db
        .delete(courseSections)
        .where(eq(courseSections.id, input.id));
    }),

  /** Calculate an auto duration for a section by summing the recommended
   *  time of every quiz question inside the section's quiz activities. */
  getAutoDuration: protectedProcedure
    .input(z.object({ sectionId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({
          total: sql<number>`coalesce(sum(${quizQuestions.recommendedTimeMins}), 0)`,
        })
        .from(courseSections)
        .leftJoin(
          activities,
          and(
            eq(activities.sectionId, courseSections.id),
            eq(activities.type, "quiz"),
          ),
        )
        .leftJoin(
          quizQuestions,
          eq(quizQuestions.quizActivityId, activities.id),
        )
        .where(eq(courseSections.id, input.sectionId));
      return result?.total ?? 0;
    }),

  /** Map of sectionId -> auto duration for every section in a course. */
  getAutoDurations: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          sectionId: courseSections.id,
          autoDuration: sql<number>`coalesce(sum(${quizQuestions.recommendedTimeMins}), 0)`,
        })
        .from(courseSections)
        .leftJoin(
          activities,
          and(
            eq(activities.sectionId, courseSections.id),
            eq(activities.type, "quiz"),
          ),
        )
        .leftJoin(
          quizQuestions,
          eq(quizQuestions.quizActivityId, activities.id),
        )
        .where(eq(courseSections.courseId, input.courseId))
        .groupBy(courseSections.id);

      return new Map(rows.map((r) => [r.sectionId, r.autoDuration]));
    }),

  /** Sum effective durations for all sections in a course.
   *  Manual sections use their stored durationMins; auto sections use getAutoDuration. */
  getCourseDuration: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          sectionId: courseSections.id,
          durationMode: courseSections.durationMode,
          durationMins: courseSections.durationMins,
          autoDuration: sql<number>`coalesce(sum(${quizQuestions.recommendedTimeMins}), 0)`,
        })
        .from(courseSections)
        .leftJoin(
          activities,
          and(
            eq(activities.sectionId, courseSections.id),
            eq(activities.type, "quiz"),
          ),
        )
        .leftJoin(
          quizQuestions,
          eq(quizQuestions.quizActivityId, activities.id),
        )
        .where(eq(courseSections.courseId, input.courseId))
        .groupBy(
          courseSections.id,
          courseSections.durationMode,
          courseSections.durationMins,
        );

      return rows.reduce((sum, row) => {
        const effective =
          row.durationMode === "auto" ? row.autoDuration : row.durationMins;
        return sum + effective;
      }, 0);
    }),

  /** Reorder sections (array of {id, sortOrder}). */
  reorder: teacherProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        order: z.array(
          z.object({ id: z.number().int(), order: z.number().int() }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);
      await Promise.all(
        input.order.map(({ id, order }) =>
          ctx.db
            .update(courseSections)
            .set({ order })
            .where(
              and(
                eq(courseSections.id, id),
                eq(courseSections.courseId, input.courseId),
              ),
            ),
        ),
      );
    }),
});
