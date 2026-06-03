import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifications } from "~/server/db/schema";

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
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.session.user.id)));
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, ctx.session.user.id), isNull(notifications.readAt)));
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.session.user.id), isNull(notifications.readAt)));
    return rows.length;
  }),
});
