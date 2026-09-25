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
import { getCourseReleaseState } from "~/server/lib/drip";
import {
  activities,
  activityReleaseRules,
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

export const activityRouter = createTRPCRouter({
  getCourseReleaseState: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const state = await getCourseReleaseState(
        ctx.db,
        ctx.session.user.id,
        input.courseId,
      );
      return {
        sections: Object.fromEntries(state.sections),
        activities: Object.fromEntries(state.activities),
      };
    }),

  getReleaseRules: teacherProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(activityReleaseRules)
        .where(eq(activityReleaseRules.activityId, input.activityId)),
    ),

  setReleaseRules: teacherProcedure
    .input(
      z.object({
        activityId: z.number().int(),
        rules: z.array(releaseRuleInputSchema).max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const courseId = await getCourseIdFromActivity(ctx.db, input.activityId);
      if (!courseId) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
      await ctx.db.transaction(async (tx) => {
        await tx
          .delete(activityReleaseRules)
          .where(eq(activityReleaseRules.activityId, input.activityId));
        if (input.rules.length)
          await tx.insert(activityReleaseRules).values(
            input.rules.map((rule) => ({
              activityId: input.activityId,
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
      if (ctx.session.user.role === "student") {
        const courseId = await getCourseIdFromActivity(ctx.db, activity.id);
        if (!courseId) throw new TRPCError({ code: "NOT_FOUND" });
        const releaseState = await getCourseReleaseState(
          ctx.db,
          ctx.session.user.id,
          courseId,
        );
        const state = releaseState.activities.get(activity.id);
        if (state && !state.released)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: state.reason ?? "This activity is locked",
          });
      }
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
