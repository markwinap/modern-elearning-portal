import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  activities,
  activityProgress,
  courseProgress,
  courseSections,
  courses,
  enrollments,
} from "~/server/db/schema";

export const progressRouter = createTRPCRouter({
  markActivity: protectedProcedure
    .input(
      z.object({
        activityId: z.number().int(),
        status: z.enum(["not_started", "in_progress", "completed"]),
        timeSpentSecs: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        await tx
          .insert(activityProgress)
          .values({
            activityId: input.activityId,
            userId: ctx.session.user.id,
            status: input.status,
            firstViewedAt: new Date(),
            completedAt: input.status === "completed" ? new Date() : null,
            timeSpentSecs: input.timeSpentSecs ?? 0,
          })
          .onConflictDoUpdate({
            target: [activityProgress.userId, activityProgress.activityId],
            set: {
              status: input.status,
              completedAt: input.status === "completed" ? new Date() : null,
              timeSpentSecs: sql`${activityProgress.timeSpentSecs} + ${input.timeSpentSecs ?? 0}`,
            },
          });

        const [activityRow] = await tx
          .select({ courseId: courseSections.courseId })
          .from(activities)
          .innerJoin(
            courseSections,
            eq(activities.sectionId, courseSections.id),
          )
          .where(eq(activities.id, input.activityId))
          .limit(1);

        if (!activityRow) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Activity not found",
          });
        }

        const role = ctx.session.user.role;
        const isTeacherOrAdmin = role === "teacher" || role === "admin";

        if (!isTeacherOrAdmin) {
          const [activeEnrollment] = await tx
            .select({ id: enrollments.id })
            .from(enrollments)
            .where(
              and(
                eq(enrollments.courseId, activityRow.courseId),
                eq(enrollments.userId, ctx.session.user.id),
                eq(enrollments.status, "active"),
              ),
            )
            .limit(1);

          if (!activeEnrollment) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You must be actively enrolled in this course",
            });
          }
        }

        const [totalActivitiesResult] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(activities)
          .innerJoin(
            courseSections,
            eq(activities.sectionId, courseSections.id),
          )
          .where(
            and(
              eq(courseSections.courseId, activityRow.courseId),
              eq(courseSections.visible, true),
              eq(activities.visible, true),
            ),
          );

        const [completedActivitiesResult] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(activities)
          .innerJoin(
            courseSections,
            eq(activities.sectionId, courseSections.id),
          )
          .innerJoin(
            activityProgress,
            and(
              eq(activityProgress.activityId, activities.id),
              eq(activityProgress.userId, ctx.session.user.id),
              eq(activityProgress.status, "completed"),
            ),
          )
          .where(
            and(
              eq(courseSections.courseId, activityRow.courseId),
              eq(courseSections.visible, true),
              eq(activities.visible, true),
            ),
          );

        const totalActivities = totalActivitiesResult?.count ?? 0;
        const completedActivities = completedActivitiesResult?.count ?? 0;
        const computedProgressPct =
          totalActivities > 0
            ? Math.min(
                100,
                Math.max(
                  0,
                  Math.round((completedActivities / totalActivities) * 100),
                ),
              )
            : 0;

        await tx
          .insert(courseProgress)
          .values({
            courseId: activityRow.courseId,
            userId: ctx.session.user.id,
            progressPct: computedProgressPct,
            completedAt: computedProgressPct >= 100 ? new Date() : null,
          })
          .onConflictDoUpdate({
            target: [courseProgress.userId, courseProgress.courseId],
            set: {
              progressPct: computedProgressPct,
              completedAt: computedProgressPct >= 100 ? new Date() : null,
            },
          });
      });
    }),

  getActivityProgress: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(activityProgress)
        .where(
          and(
            eq(activityProgress.activityId, input.activityId),
            eq(activityProgress.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      return row ?? null;
    }),

  getCourseProgress: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(courseProgress)
        .where(
          and(
            eq(courseProgress.courseId, input.courseId),
            eq(courseProgress.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      return row ?? null;
    }),

  getMyRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(5) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: activityProgress.id,
          activityId: activityProgress.activityId,
          status: activityProgress.status,
          firstViewedAt: activityProgress.firstViewedAt,
          completedAt: activityProgress.completedAt,
          timeSpentSecs: activityProgress.timeSpentSecs,
          activityTitle: activities.title,
          courseTitle: courses.title,
          courseSlug: courses.slug,
        })
        .from(activityProgress)
        .innerJoin(activities, eq(activityProgress.activityId, activities.id))
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .where(eq(activityProgress.userId, ctx.session.user.id))
        .orderBy(desc(activityProgress.firstViewedAt))
        .limit(input.limit);
    }),

  updateCourseProgress: protectedProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        progressPct: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(courseProgress)
        .values({
          courseId: input.courseId,
          userId: ctx.session.user.id,
          progressPct: input.progressPct,
          completedAt: input.progressPct >= 100 ? new Date() : null,
        })
        .onConflictDoUpdate({
          target: [courseProgress.userId, courseProgress.courseId],
          set: {
            progressPct: input.progressPct,
            completedAt: input.progressPct >= 100 ? new Date() : null,
          },
        });
    }),
});
