import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  DEFAULT_GAMIFICATION_RULES,
  gamificationRulesSchema,
} from "~/lib/gamification-rules";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  badgeDefinitions,
  courses,
  gamificationConfig,
  leaderboardSnapshots,
  pointsLedger,
  userBadges,
  userLevels,
  userStreaks,
} from "~/server/db/schema";
import {
  getLeaderboardEntries,
  processGamificationEvent,
  refreshLeaderboardSnapshot,
} from "~/server/lib/gamification";

const leaderboardInputSchema = z.object({
  scope: z.enum(["global", "course"]),
  courseId: z.number().int().optional(),
  period: z.string().default("allTime"),
  limit: z.number().int().min(1).max(100).default(50),
});

export const gamificationRouter = createTRPCRouter({
  getMyStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [[levelRow], [streakRow], earnedBadges] = await Promise.all([
      ctx.db
        .select({
          totalPoints: userLevels.totalPoints,
          level: userLevels.level,
        })
        .from(userLevels)
        .where(eq(userLevels.userId, userId))
        .limit(1),
      ctx.db
        .select({
          currentStreak: userStreaks.currentStreak,
          longestStreak: userStreaks.longestStreak,
        })
        .from(userStreaks)
        .where(eq(userStreaks.userId, userId))
        .limit(1),
      ctx.db
        .select({
          key: badgeDefinitions.key,
          name: badgeDefinitions.name,
          description: badgeDefinitions.description,
          icon: badgeDefinitions.icon,
          awardedAt: userBadges.awardedAt,
        })
        .from(userBadges)
        .innerJoin(
          badgeDefinitions,
          eq(userBadges.badgeId, badgeDefinitions.id),
        )
        .where(eq(userBadges.userId, userId))
        .orderBy(desc(userBadges.awardedAt)),
    ]);

    return {
      points: levelRow?.totalPoints ?? 0,
      level: levelRow?.level ?? 1,
      currentStreak: streakRow?.currentStreak ?? 0,
      longestStreak: streakRow?.longestStreak ?? 0,
      badges: earnedBadges,
    };
  }),

  getRecentPoints: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: pointsLedger.id,
          amount: pointsLedger.amount,
          reason: pointsLedger.reason,
          sourceType: pointsLedger.sourceType,
          createdAt: pointsLedger.createdAt,
          courseTitle: courses.title,
        })
        .from(pointsLedger)
        .leftJoin(courses, eq(pointsLedger.courseId, courses.id))
        .where(eq(pointsLedger.userId, ctx.session.user.id))
        .orderBy(desc(pointsLedger.createdAt))
        .limit(input.limit);
    }),

  getLeaderboard: protectedProcedure
    .input(leaderboardInputSchema)
    .query(async ({ ctx, input }) => {
      const [snapshot] = await ctx.db
        .select({
          entries: leaderboardSnapshots.entries,
          calculatedAt: leaderboardSnapshots.calculatedAt,
        })
        .from(leaderboardSnapshots)
        .where(
          and(
            eq(leaderboardSnapshots.scope, input.scope),
            eq(leaderboardSnapshots.period, input.period),
            input.courseId != null
              ? eq(leaderboardSnapshots.courseId, input.courseId)
              : isNull(leaderboardSnapshots.courseId),
          ),
        )
        .orderBy(desc(leaderboardSnapshots.calculatedAt))
        .limit(1);

      if (snapshot) {
        return {
          entries: snapshot.entries.slice(0, input.limit),
          calculatedAt: snapshot.calculatedAt,
        };
      }

      const live = await getLeaderboardEntries(
        ctx.db,
        input.scope,
        input.courseId,
      );
      return {
        entries: live.slice(0, input.limit),
        calculatedAt: null,
      };
    }),

  refreshLeaderboard: adminProcedure
    .input(leaderboardInputSchema)
    .mutation(async ({ ctx, input }) => {
      return refreshLeaderboardSnapshot(
        ctx.db,
        input.scope,
        input.courseId,
        input.period,
      );
    }),

  recordDailyLogin: protectedProcedure.mutation(async ({ ctx }) => {
    const date = new Date().toISOString().split("T")[0] ?? "";
    return processGamificationEvent(ctx.db, ctx.session.user.id, {
      type: "daily_login",
      date,
    });
  }),

  getConfig: adminProcedure.query(async ({ ctx }) => {
    const [config] = await ctx.db
      .select()
      .from(gamificationConfig)
      .orderBy(desc(gamificationConfig.id))
      .limit(1);

    if (!config) return DEFAULT_GAMIFICATION_RULES;

    return {
      activityCompletedPoints: config.activityCompletedPoints,
      quizPassedPoints: config.quizPassedPoints,
      courseCompletedPoints: config.courseCompletedPoints,
      dailyLoginPoints: config.dailyLoginPoints,
      skillAttainedPoints: config.skillAttainedPoints,
      levelThresholds: Array.isArray(config.levelThresholds)
        ? config.levelThresholds
        : DEFAULT_GAMIFICATION_RULES.levelThresholds,
    };
  }),

  updateConfig: adminProcedure
    .input(gamificationRulesSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: gamificationConfig.id })
        .from(gamificationConfig)
        .orderBy(desc(gamificationConfig.id))
        .limit(1);

      if (existing) {
        const [updated] = await ctx.db
          .update(gamificationConfig)
          .set(input)
          .where(eq(gamificationConfig.id, existing.id))
          .returning();
        return updated ?? input;
      }

      const [created] = await ctx.db
        .insert(gamificationConfig)
        .values(input)
        .returning();
      return created ?? input;
    }),
});
