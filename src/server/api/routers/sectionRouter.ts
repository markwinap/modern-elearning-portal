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
  sectionReleaseRules,
} from "~/server/db/schema";

const releaseRuleInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("date"), releaseAt: z.coerce.date() }),
  z.object({
    type: z.literal("enrollment_offset"),
    offsetDays: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("activity_completion"),
    prerequisiteActivityId: z.number().int(),
  }),
  z.object({
    type: z.literal("prerequisite_score"),
    prerequisiteActivityId: z.number().int(),
    minimumScore: z.number().int().min(0).max(100),
  }),
  z.object({ type: z.literal("manual"), manuallyReleased: z.boolean() }),
]);

export const sectionRouter = createTRPCRouter({
  getReleaseRules: teacherProcedure
    .input(z.object({ sectionId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(sectionReleaseRules)
        .where(eq(sectionReleaseRules.sectionId, input.sectionId));
    }),

  setReleaseRules: teacherProcedure
    .input(
      z.object({
        sectionId: z.number().int(),
        rules: z.array(releaseRuleInputSchema).max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [section] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courseSections)
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .where(eq(courseSections.id, input.sectionId))
        .limit(1);
      if (!section) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, section.teacherId);
      await ctx.db.transaction(async (tx) => {
        await tx
          .delete(sectionReleaseRules)
          .where(eq(sectionReleaseRules.sectionId, input.sectionId));
        if (input.rules.length)
          await tx
            .insert(sectionReleaseRules)
            .values(
              input.rules.map((rule) => ({
                sectionId: input.sectionId,
                type: rule.type,
                releaseAt: rule.type === "date" ? rule.releaseAt : null,
                offsetDays:
                  rule.type === "enrollment_offset" ? rule.offsetDays : null,
                prerequisiteActivityId:
                  rule.type === "activity_completion" ||
                  rule.type === "prerequisite_score"
                    ? rule.prerequisiteActivityId
                    : null,
                minimumScore:
                  rule.type === "prerequisite_score" ? rule.minimumScore : null,
                manuallyReleased:
                  rule.type === "manual" ? rule.manuallyReleased : false,
              })),
            );
      });
    }),

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
