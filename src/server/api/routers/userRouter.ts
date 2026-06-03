import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { courses, enrollments, user } from "~/server/db/schema";

export const userRouter = createTRPCRouter({
  /** Get the currently authenticated user's profile. */
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const [me] = await ctx.db
      .select()
      .from(user)
      .where(eq(user.id, ctx.session.user.id))
      .limit(1);
    if (!me) throw new TRPCError({ code: "NOT_FOUND" });
    return me;
  }),

  /** List all users (admin only). */
  listUsers: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      const rows = await ctx.db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          banned: user.banned,
          createdAt: user.createdAt,
        })
        .from(user)
        .limit(input.limit)
        .offset(offset);

      return rows;
    }),

  /** Set a user's role (admin only). */
  setRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["student", "teacher", "admin"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ role: input.role })
        .where(eq(user.id, input.userId));
    }),

  /** Ban a user (admin only). */
  banUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().min(1),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({
          banned: true,
          banReason: input.reason,
          banExpires: input.expiresAt ?? null,
        })
        .where(eq(user.id, input.userId));
    }),

  /** Unban a user (admin only). */
  unbanUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ banned: false, banReason: null, banExpires: null })
        .where(eq(user.id, input.userId));
    }),

  /** Platform-wide stats (admin only). */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [userCount] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(user);
    const [courseCount] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(courses);
    const [enrollmentCount] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollments);
    return {
      users: userCount?.count ?? 0,
      courses: courseCount?.count ?? 0,
      enrollments: enrollmentCount?.count ?? 0,
    };
  }),
});
