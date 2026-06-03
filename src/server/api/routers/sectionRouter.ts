import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { courses, courseSections } from "~/server/db/schema";

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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      const role = ctx.session.user.role as string | undefined;
      if (course.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
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
      const role = ctx.session.user.role as string | undefined;
      if (course?.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.update(courseSections).set(data).where(eq(courseSections.id, id));
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
      const role = ctx.session.user.role as string | undefined;
      if (course?.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.delete(courseSections).where(eq(courseSections.id, input.id));
    }),

  /** Reorder sections (array of {id, sortOrder}). */
  reorder: teacherProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        order: z.array(z.object({ id: z.number().int(), order: z.number().int() })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      const role = ctx.session.user.role as string | undefined;
      if (course.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await Promise.all(
        input.order.map(({ id, order }) =>
          ctx.db
            .update(courseSections)
            .set({ order })
            .where(and(eq(courseSections.id, id), eq(courseSections.courseId, input.courseId))),
        ),
      );
    }),
});
