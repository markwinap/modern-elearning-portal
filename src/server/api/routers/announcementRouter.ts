import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  announcements,
  courses,
  enrollments,
  notifications,
} from "~/server/db/schema";

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
        .select({
          teacherId: courses.teacherId,
          title: courses.title,
          slug: courses.slug,
        })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);
      const [announcement] = await ctx.db
        .insert(announcements)
        .values({ ...input, authorId: ctx.session.user.id })
        .returning();
      if (!announcement) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const recipients = await ctx.db
        .select({ userId: enrollments.userId })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.courseId, input.courseId),
            eq(enrollments.status, "active"),
          ),
        );

      const recipientValues = recipients
        .map((recipient) => recipient.userId)
        .filter((userId) => userId !== ctx.session.user.id)
        .map((userId) => ({
          userId,
          type: "announcement_posted",
          payload: {
            courseId: input.courseId,
            courseSlug: course.slug,
            courseTitle: course.title,
            announcementId: announcement.id,
            title: announcement.title,
          },
        }));

      if (recipientValues.length > 0) {
        await ctx.db.insert(notifications).values(recipientValues);
      }

      return announcement;
    }),

  delete: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [announcement] = await ctx.db
        .select({
          courseId: announcements.courseId,
          authorId: announcements.authorId,
        })
        .from(announcements)
        .where(eq(announcements.id, input.id))
        .limit(1);
      if (!announcement) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, announcement.authorId);
      await ctx.db.delete(announcements).where(eq(announcements.id, input.id));
    }),
});
