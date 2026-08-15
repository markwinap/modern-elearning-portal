import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  courses,
  enrollments,
  notifications,
  platformSettings,
  user,
} from "~/server/db/schema";

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
        .select({
          status: courses.status,
          accessKey: courses.accessKey,
          maxEnrollments: courses.maxEnrollments,
          teacherId: courses.teacherId,
          title: courses.title,
          slug: courses.slug,
        })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      if (course.status !== "published")
        throw new TRPCError({ code: "FORBIDDEN" });
      if (course.accessKey && course.accessKey !== input.accessKey) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid access key",
        });
      }

      const [settings] = await ctx.db
        .select({
          defaultEnrollmentMode: platformSettings.defaultEnrollmentMode,
        })
        .from(platformSettings)
        .orderBy(desc(platformSettings.id))
        .limit(1);
      const requiresApproval = settings?.defaultEnrollmentMode === "approval";

      if (course.maxEnrollments) {
        const [cnt] = await ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.courseId, input.courseId),
              eq(enrollments.status, "active"),
            ),
          );
        if ((cnt?.count ?? 0) >= course.maxEnrollments) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Course is full" });
        }
      }
      const [existing] = await ctx.db
        .select()
        .from(enrollments)
        .where(
          and(
            eq(enrollments.courseId, input.courseId),
            eq(enrollments.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      if (existing && existing.status !== "rejected") return existing;

      const newStatus = requiresApproval ? "pending" : "active";
      let enrollment: typeof existing;

      if (existing) {
        // A previously rejected student is re-applying
        [enrollment] = await ctx.db
          .update(enrollments)
          .set({
            status: newStatus,
            enrolledAt: new Date(),
            reviewedBy: null,
            reviewedAt: null,
            rejectionReason: null,
          })
          .where(eq(enrollments.id, existing.id))
          .returning();
      } else {
        [enrollment] = await ctx.db
          .insert(enrollments)
          .values({
            courseId: input.courseId,
            userId: ctx.session.user.id,
            role: "student",
            status: newStatus,
          })
          .returning();
      }

      if (!enrollment) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      if (course.teacherId !== ctx.session.user.id) {
        await ctx.db.insert(notifications).values({
          userId: course.teacherId,
          type: requiresApproval ? "enrollment_request" : "course_enrollment",
          payload: {
            courseId: input.courseId,
            courseSlug: course.slug,
            courseTitle: course.title,
            enrollmentId: enrollment.id,
            studentId: ctx.session.user.id,
            status: newStatus,
          },
        });
      }

      return enrollment;
    }),

  unenroll: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(enrollments)
        .where(
          and(
            eq(enrollments.courseId, input.courseId),
            eq(enrollments.userId, ctx.session.user.id),
          ),
        );
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
      assertOwnerOrAdmin(ctx, course?.teacherId);
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
        .where(
          and(
            eq(enrollments.courseId, input.courseId),
            eq(enrollments.role, "student"),
          ),
        );
    }),

  updateStatus: teacherProcedure
    .input(
      z.object({
        enrollmentId: z.number().int(),
        status: z.enum(["active", "suspended", "completed", "waitlisted"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [enrollment] = await ctx.db
        .select({
          courseId: enrollments.courseId,
          userId: enrollments.userId,
          status: enrollments.status,
        })
        .from(enrollments)
        .where(eq(enrollments.id, input.enrollmentId))
        .limit(1);
      if (!enrollment) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({
          teacherId: courses.teacherId,
          title: courses.title,
          slug: courses.slug,
        })
        .from(courses)
        .where(eq(courses.id, enrollment.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
      await ctx.db
        .update(enrollments)
        .set({ status: input.status })
        .where(eq(enrollments.id, input.enrollmentId));

      if (
        enrollment.userId !== ctx.session.user.id &&
        enrollment.status !== input.status
      ) {
        await ctx.db.insert(notifications).values({
          userId: enrollment.userId,
          type: "enrollment_status_changed",
          payload: {
            enrollmentId: input.enrollmentId,
            courseId: enrollment.courseId,
            courseSlug: course?.slug,
            courseTitle: course?.title,
            oldStatus: enrollment.status,
            newStatus: input.status,
          },
        });
      }
    }),

  isEnrolled: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          id: enrollments.id,
          status: enrollments.status,
          rejectionReason: enrollments.rejectionReason,
        })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.courseId, input.courseId),
            eq(enrollments.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      return row ?? null;
    }),

  /** List pending enrollment requests for a course. */
  listPending: teacherProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
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
        .where(
          and(
            eq(enrollments.courseId, input.courseId),
            eq(enrollments.status, "pending"),
          ),
        )
        .orderBy(desc(enrollments.enrolledAt));
    }),

  /** Approve a pending enrollment request. */
  approve: teacherProcedure
    .input(z.object({ enrollmentId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [enrollment] = await ctx.db
        .select({
          id: enrollments.id,
          courseId: enrollments.courseId,
          userId: enrollments.userId,
          status: enrollments.status,
        })
        .from(enrollments)
        .where(eq(enrollments.id, input.enrollmentId))
        .limit(1);
      if (!enrollment) throw new TRPCError({ code: "NOT_FOUND" });
      if (enrollment.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enrollment is not pending",
        });
      }

      const [course] = await ctx.db
        .select({
          teacherId: courses.teacherId,
          maxEnrollments: courses.maxEnrollments,
          title: courses.title,
          slug: courses.slug,
        })
        .from(courses)
        .where(eq(courses.id, enrollment.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);

      if (course?.maxEnrollments) {
        const [cnt] = await ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(enrollments)
          .where(
            and(
              eq(enrollments.courseId, enrollment.courseId),
              eq(enrollments.status, "active"),
            ),
          );
        if ((cnt?.count ?? 0) >= course.maxEnrollments) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Course is full" });
        }
      }

      const [updated] = await ctx.db
        .update(enrollments)
        .set({
          status: "active",
          reviewedBy: ctx.session.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(enrollments.id, input.enrollmentId))
        .returning();

      if (updated) {
        await ctx.db.insert(notifications).values({
          userId: enrollment.userId,
          type: "enrollment_approved",
          payload: {
            enrollmentId: updated.id,
            courseId: enrollment.courseId,
            courseSlug: course?.slug,
            courseTitle: course?.title,
          },
        });
      }

      return updated;
    }),

  /** Reject a pending enrollment request. */
  reject: teacherProcedure
    .input(
      z.object({
        enrollmentId: z.number().int(),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [enrollment] = await ctx.db
        .select({
          id: enrollments.id,
          courseId: enrollments.courseId,
          userId: enrollments.userId,
          status: enrollments.status,
        })
        .from(enrollments)
        .where(eq(enrollments.id, input.enrollmentId))
        .limit(1);
      if (!enrollment) throw new TRPCError({ code: "NOT_FOUND" });
      if (enrollment.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enrollment is not pending",
        });
      }

      const [course] = await ctx.db
        .select({
          teacherId: courses.teacherId,
          title: courses.title,
          slug: courses.slug,
        })
        .from(courses)
        .where(eq(courses.id, enrollment.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);

      const [updated] = await ctx.db
        .update(enrollments)
        .set({
          status: "rejected",
          reviewedBy: ctx.session.user.id,
          reviewedAt: new Date(),
          rejectionReason: input.reason ?? null,
        })
        .where(eq(enrollments.id, input.enrollmentId))
        .returning();

      if (updated) {
        await ctx.db.insert(notifications).values({
          userId: enrollment.userId,
          type: "enrollment_rejected",
          payload: {
            enrollmentId: updated.id,
            courseId: enrollment.courseId,
            courseSlug: course?.slug,
            courseTitle: course?.title,
            reason: input.reason,
          },
        });
      }

      return updated;
    }),
});
