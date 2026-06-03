import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { courses, enrollments, user } from "~/server/db/schema";

export const enrollmentRouter = createTRPCRouter({
  enroll: protectedProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        accessKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ status: courses.status, accessKey: courses.accessKey, maxEnrollments: courses.maxEnrollments })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      if (course.status !== "published") throw new TRPCError({ code: "FORBIDDEN" });
      if (course.accessKey && course.accessKey !== input.accessKey) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid access key" });
      }
      if (course.maxEnrollments) {
        const [cnt] = await ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(enrollments)
          .where(and(eq(enrollments.courseId, input.courseId), eq(enrollments.status, "active")));
        if ((cnt?.count ?? 0) >= course.maxEnrollments) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Course is full" });
        }
      }
      const [existing] = await ctx.db
        .select()
        .from(enrollments)
        .where(and(eq(enrollments.courseId, input.courseId), eq(enrollments.userId, ctx.session.user.id)))
        .limit(1);
      if (existing) return existing;
      const [enrollment] = await ctx.db
        .insert(enrollments)
        .values({ courseId: input.courseId, userId: ctx.session.user.id, role: "student", status: "active" })
        .returning();
      return enrollment;
    }),

  unenroll: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(enrollments)
        .where(and(eq(enrollments.courseId, input.courseId), eq(enrollments.userId, ctx.session.user.id)));
    }),

  getMyEnrollments: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: enrollments.id,
        courseId: enrollments.courseId,
        status: enrollments.status,
        enrolledAt: enrollments.enrolledAt,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        courseCoverImageUrl: courses.coverImageUrl,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.userId, ctx.session.user.id))
      .orderBy(desc(enrollments.enrolledAt));
  }),

  getStudents: teacherProcedure
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
      return ctx.db
        .select({
          enrollmentId: enrollments.id,
          userId: enrollments.userId,
          status: enrollments.status,
          enrolledAt: enrollments.enrolledAt,
          userName: user.name,
          userEmail: user.email,
        })
        .from(enrollments)
        .innerJoin(user, eq(enrollments.userId, user.id))
        .where(and(eq(enrollments.courseId, input.courseId), eq(enrollments.role, "student")));
    }),

  updateStatus: teacherProcedure
    .input(z.object({
      enrollmentId: z.number().int(),
      status: z.enum(["active", "suspended", "completed", "waitlisted"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const [enrollment] = await ctx.db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(eq(enrollments.id, input.enrollmentId))
        .limit(1);
      if (!enrollment) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, enrollment.courseId))
        .limit(1);
      const role = ctx.session.user.role as string | undefined;
      if (course?.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db
        .update(enrollments)
        .set({ status: input.status })
        .where(eq(enrollments.id, input.enrollmentId));
    }),

  isEnrolled: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ status: enrollments.status })
        .from(enrollments)
        .where(and(eq(enrollments.courseId, input.courseId), eq(enrollments.userId, ctx.session.user.id)))
        .limit(1);
      return row ?? null;
    }),
});
