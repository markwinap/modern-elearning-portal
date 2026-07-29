import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { courses, courseSessions } from "~/server/db/schema";

const sessionInputSchema = z.object({
  courseId: z.number().int(),
  dayOfWeek: z.number().int().min(0).max(6),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
  location: z.string().optional(),
  classroom: z.string().optional(),
});

/** On-site course session scheduling — nested under courseRouter as `course.session.*`. */
export const courseSessionRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(courseSessions)
        .where(eq(courseSessions.courseId, input.courseId))
        .orderBy(asc(courseSessions.dayOfWeek), asc(courseSessions.startTime));
    }),

  create: teacherProcedure
    .input(sessionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);
      const [session] = await ctx.db
        .insert(courseSessions)
        .values({
          courseId: input.courseId,
          dayOfWeek: input.dayOfWeek,
          startDate: input.startDate,
          endDate: input.endDate,
          startTime: input.startTime,
          endTime: input.endTime,
          location: input.location,
          classroom: input.classroom,
        })
        .returning();
      return session;
    }),

  update: teacherProcedure
    .input(
      sessionInputSchema.omit({ courseId: true }).extend({
        id: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [existing] = await ctx.db
        .select({ courseId: courseSessions.courseId })
        .from(courseSessions)
        .where(eq(courseSessions.id, id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, existing.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);
      const [session] = await ctx.db
        .update(courseSessions)
        .set(data)
        .where(eq(courseSessions.id, id))
        .returning();
      return session;
    }),

  delete: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ courseId: courseSessions.courseId })
        .from(courseSessions)
        .where(eq(courseSessions.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, existing.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);
      await ctx.db
        .delete(courseSessions)
        .where(eq(courseSessions.id, input.id));
    }),
});
