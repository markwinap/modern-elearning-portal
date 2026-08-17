import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  NOTIFICATION_TYPES,
  notificationTypeSchema,
  type NotificationType,
} from "~/lib/notifications";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifications, notificationPreferences } from "~/server/db/schema";

export { NOTIFICATION_TYPES, notificationTypeSchema };
export type { NotificationType };

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

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const [existing] = await ctx.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.session.user.id))
      .limit(1);

    return (
      existing ?? {
        userId: ctx.session.user.id,
        emailEnabled: true,
        digestFrequency: "daily" as const,
        lastDigestSentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean(),
        digestFrequency: z.enum(["off", "daily", "weekly"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.session.user.id))
        .limit(1);

      if (existing) {
        const [updated] = await ctx.db
          .update(notificationPreferences)
          .set({
            emailEnabled: input.emailEnabled,
            digestFrequency: input.digestFrequency,
          })
          .where(eq(notificationPreferences.userId, ctx.session.user.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(notificationPreferences)
        .values({
          userId: ctx.session.user.id,
          emailEnabled: input.emailEnabled,
          digestFrequency: input.digestFrequency,
        })
        .returning();
      return created;
    }),
});
