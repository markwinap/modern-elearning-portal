import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifications } from "~/server/db/schema";

export const NOTIFICATION_TYPES = [
  "announcement_posted",
  "course_enrollment",
  "enrollment_status_changed",
  "grade_posted",
  "discussion_message",
] as const;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notificationRouter = createTRPCRouter({
  getMyNotifications: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(notifications.userId, ctx.session.user.id)];
      if (input.unreadOnly) conditions.push(isNull(notifications.readAt));
      return ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.session.user.id),
          ),
        );
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, ctx.session.user.id),
          isNull(notifications.readAt),
        ),
      );
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.session.user.id),
          ),
        );
    }),

  deleteAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.session.user.id),
          isNotNull(notifications.readAt),
        ),
      );
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.session.user.id),
          isNull(notifications.readAt),
        ),
      );
    return result?.count ?? 0;
  }),
});
