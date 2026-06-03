import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { activityProgress, courseProgress } from "~/server/db/schema";

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
      await ctx.db
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
            timeSpentSecs: input.timeSpentSecs ?? 0,
          },
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

  updateCourseProgress: protectedProcedure
    .input(z.object({ courseId: z.number().int(), progressPct: z.number().min(0).max(100) }))
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
