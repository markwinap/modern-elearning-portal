import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { activities, courses, courseSections } from "~/server/db/schema";

/** Get courseId from an activity via its section */
async function getCourseIdFromActivity(db: typeof import("~/server/db").db, activityId: number) {
  const [row] = await db
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
        type: z.enum(["lesson", "quiz", "page", "file", "url", "text_media", "wiki", "workshop"]),
        order: z.number().int().default(0),
        completionType: z.enum(["view", "submit", "grade", "time"]).default("view"),
        completionGrade: z.number().int().optional(),
        completionTimeSecs: z.number().int().optional(),
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
      const role = ctx.session.user.role as string | undefined;
      if (course?.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [activity] = await ctx.db.insert(activities).values(input).returning();
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
      const role = ctx.session.user.role as string | undefined;
      if (course?.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
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
      const role = ctx.session.user.role as string | undefined;
      if (course?.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.delete(activities).where(eq(activities.id, input.id));
    }),
});
