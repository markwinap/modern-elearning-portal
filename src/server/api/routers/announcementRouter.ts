import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, teacherProcedure } from "~/server/api/trpc";
import { announcements, courses } from "~/server/db/schema";

export const announcementRouter = createTRPCRouter({
  /** List announcements for a course. */
  listByCourse: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(announcements)
        .where(eq(announcements.courseId, input.courseId))
        .orderBy(desc(announcements.createdAt));
    }),

  /** Create an announcement (teacher of the course). */
  create: teacherProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        title: z.string().min(1).max(256),
        content: z.string().min(1),
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
      const [announcement] = await ctx.db
        .insert(announcements)
        .values({ ...input, authorId: ctx.session.user.id })
        .returning();
      return announcement;
    }),

  delete: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [announcement] = await ctx.db
        .select({ courseId: announcements.courseId, authorId: announcements.authorId })
        .from(announcements)
        .where(eq(announcements.id, input.id))
        .limit(1);
      if (!announcement) throw new TRPCError({ code: "NOT_FOUND" });
      const role = ctx.session.user.role as string | undefined;
      if (announcement.authorId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.delete(announcements).where(eq(announcements.id, input.id));
    }),
});
