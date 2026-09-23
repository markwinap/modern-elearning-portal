import { and, desc, eq, sql } from "drizzle-orm";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import {
  calculateLevel,
  DEFAULT_GAMIFICATION_RULES,
  type GamificationRules,
} from "~/lib/gamification-rules";
import type { GamificationEvent } from "~/lib/gamification-events";
import { type db } from "~/server/db";
import type * as schema from "~/server/db/schema";
import {
  badgeDefinitions,
  gamificationConfig,
  leaderboardSnapshots,
  pointsLedger,
  user,
  userBadges,
  userLevels,
  userStreaks,
  type GamificationEventSource,
} from "~/server/db/schema";

type DB =
  | typeof db
  | PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;

function dateToString(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0] ?? "";
}

function getToday(): string {
  return dateToString(new Date());
}

export async function getGamificationRules(
  database: DB,
): Promise<GamificationRules> {
  const [config] = await database
    .select({
      activityCompletedPoints: gamificationConfig.activityCompletedPoints,
      quizPassedPoints: gamificationConfig.quizPassedPoints,
      courseCompletedPoints: gamificationConfig.courseCompletedPoints,
      dailyLoginPoints: gamificationConfig.dailyLoginPoints,
      levelThresholds: gamificationConfig.levelThresholds,
    })
    .from(gamificationConfig)
    .orderBy(desc(gamificationConfig.id))
    .limit(1);

  return {
    activityCompletedPoints:
      config?.activityCompletedPoints ??
      DEFAULT_GAMIFICATION_RULES.activityCompletedPoints,
    quizPassedPoints:
      config?.quizPassedPoints ?? DEFAULT_GAMIFICATION_RULES.quizPassedPoints,
    courseCompletedPoints:
      config?.courseCompletedPoints ??
      DEFAULT_GAMIFICATION_RULES.courseCompletedPoints,
    dailyLoginPoints:
      config?.dailyLoginPoints ?? DEFAULT_GAMIFICATION_RULES.dailyLoginPoints,
    levelThresholds: Array.isArray(config?.levelThresholds)
      ? config.levelThresholds
      : DEFAULT_GAMIFICATION_RULES.levelThresholds,
  };
}

const DEFAULT_BADGES: Array<{
  key: string;
  name: string;
  description: string;
  icon: string;
  criteriaType: (typeof badgeDefinitions.$inferSelect)["criteriaType"];
  criteriaValue: Record<string, unknown>;
}> = [
  {
    key: "first_steps",
    name: "First Steps",
    description: "Complete your first learning activity.",
    icon: "StarOutlined",
    criteriaType: "activity_count",
    criteriaValue: { count: 1 },
  },
  {
    key: "quiz_whiz",
    name: "Quiz Whiz",
    description: "Pass 3 quizzes.",
    icon: "TrophyOutlined",
    criteriaType: "quiz_count",
    criteriaValue: { count: 3 },
  },
  {
    key: "course_graduate",
    name: "Course Graduate",
    description: "Complete a full course.",
    icon: "BookOutlined",
    criteriaType: "course_count",
    criteriaValue: { count: 1 },
  },
  {
    key: "streak_starter",
    name: "Streak Starter",
    description: "Maintain a 3-day learning streak.",
    icon: "FireOutlined",
    criteriaType: "streak_days",
    criteriaValue: { days: 3 },
  },
  {
    key: "point_collector",
    name: "Point Collector",
    description: "Earn 100 points.",
    icon: "DollarOutlined",
    criteriaType: "points_threshold",
    criteriaValue: { points: 100 },
  },
];

export async function ensureDefaultBadgeDefinitions(database: DB) {
  const existing = await database
    .select({ key: badgeDefinitions.key })
    .from(badgeDefinitions)
    .limit(1);

  if (existing.length > 0) return;

  await database.insert(badgeDefinitions).values(DEFAULT_BADGES);
}

export async function getTotalPoints(
  database: DB,
  userId: string,
): Promise<number> {
  const [result] = await database
    .select({
      total: sql<number>`coalesce(sum(${pointsLedger.amount}), 0)::int`,
    })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId));
  return result?.total ?? 0;
}

async function awardPoints(
  database: DB,
  userId: string,
  amount: number,
  sourceType: GamificationEventSource,
  sourceId: string,
  courseId: number | null,
  reason: string,
): Promise<boolean> {
  const [row] = await database
    .insert(pointsLedger)
    .values({
      userId,
      amount,
      sourceType,
      sourceId,
      courseId,
      reason,
    })
    .onConflictDoNothing({
      target: [
        pointsLedger.userId,
        pointsLedger.sourceType,
        pointsLedger.sourceId,
      ],
    })
    .returning({ id: pointsLedger.id });
  return row != null;
}

async function updateStreak(database: DB, userId: string) {
  const today = getToday();
  const [existing] = await database
    .select()
    .from(userStreaks)
    .where(eq(userStreaks.userId, userId))
    .limit(1);

  if (!existing) {
    await database.insert(userStreaks).values({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: today,
    });
    return { currentStreak: 1, longestStreak: 1 };
  }

  if (existing.lastActivityDate === today) {
    return {
      currentStreak: existing.currentStreak,
      longestStreak: existing.longestStreak,
    };
  }

  const continued = existing.lastActivityDate === addDays(today, -1);
  const currentStreak = continued ? existing.currentStreak + 1 : 1;
  const longestStreak = Math.max(existing.longestStreak, currentStreak);

  await database
    .update(userStreaks)
    .set({ currentStreak, longestStreak, lastActivityDate: today })
    .where(eq(userStreaks.userId, userId));

  return { currentStreak, longestStreak };
}

async function updateUserLevel(
  database: DB,
  userId: string,
  totalPoints: number,
  thresholds: number[],
) {
  const level = calculateLevel(totalPoints, thresholds);
  await database
    .insert(userLevels)
    .values({ userId, totalPoints, level })
    .onConflictDoUpdate({
      target: [userLevels.userId],
      set: { totalPoints, level },
    });
  return level;
}

async function evaluateBadges(database: DB, userId: string) {
  const [streak] = await database
    .select({ currentStreak: userStreaks.currentStreak })
    .from(userStreaks)
    .where(eq(userStreaks.userId, userId))
    .limit(1);

  const totalPoints = await getTotalPoints(database, userId);
  const sourceCounts = await database
    .select({
      sourceType: pointsLedger.sourceType,
      count: sql<number>`count(distinct ${pointsLedger.sourceId})::int`,
    })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId))
    .groupBy(pointsLedger.sourceType);

  const countBySource = new Map<GamificationEventSource, number>();
  for (const row of sourceCounts) {
    countBySource.set(row.sourceType, row.count);
  }

  const ownedBadgeIds = await database
    .select({ badgeId: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));
  const owned = new Set(ownedBadgeIds.map((b) => b.badgeId));

  const allBadges = await database.select().from(badgeDefinitions);
  const awarded: Array<typeof badgeDefinitions.$inferSelect> = [];

  for (const badge of allBadges) {
    if (owned.has(badge.id)) continue;

    const value = badge.criteriaValue;
    let qualifies = false;

    switch (badge.criteriaType) {
      case "points_threshold": {
        const threshold = Number(value.points ?? 0);
        qualifies = totalPoints >= threshold;
        break;
      }
      case "activity_count": {
        const required = Number(value.count ?? 0);
        qualifies = (countBySource.get("activity_completed") ?? 0) >= required;
        break;
      }
      case "quiz_count": {
        const required = Number(value.count ?? 0);
        qualifies = (countBySource.get("quiz_passed") ?? 0) >= required;
        break;
      }
      case "course_count": {
        const required = Number(value.count ?? 0);
        qualifies = (countBySource.get("course_completed") ?? 0) >= required;
        break;
      }
      case "streak_days": {
        const required = Number(value.days ?? 0);
        qualifies = (streak?.currentStreak ?? 0) >= required;
        break;
      }
    }

    if (qualifies) {
      await database.insert(userBadges).values({ userId, badgeId: badge.id });
      awarded.push(badge);
    }
  }

  return awarded;
}

interface ProcessResult {
  pointsAwarded: number;
  totalPoints: number;
  level: number;
  badges: Array<typeof badgeDefinitions.$inferSelect>;
}

export async function processGamificationEvent(
  database: DB,
  userId: string,
  event: GamificationEvent,
): Promise<ProcessResult> {
  const rules = await getGamificationRules(database);
  await ensureDefaultBadgeDefinitions(database);
  await updateStreak(database, userId);

  let pointsAwarded = 0;

  switch (event.type) {
    case "activity_completed": {
      const awarded = await awardPoints(
        database,
        userId,
        rules.activityCompletedPoints,
        "activity_completed",
        String(event.activityId),
        event.courseId,
        "Activity completed",
      );
      if (awarded) pointsAwarded += rules.activityCompletedPoints;
      break;
    }
    case "quiz_passed": {
      const awarded = await awardPoints(
        database,
        userId,
        rules.quizPassedPoints,
        "quiz_passed",
        String(event.attemptId),
        event.courseId,
        "Quiz passed",
      );
      if (awarded) pointsAwarded += rules.quizPassedPoints;
      break;
    }
    case "course_completed": {
      const awarded = await awardPoints(
        database,
        userId,
        rules.courseCompletedPoints,
        "course_completed",
        String(event.courseId),
        event.courseId,
        "Course completed",
      );
      if (awarded) pointsAwarded += rules.courseCompletedPoints;
      break;
    }
    case "daily_login": {
      const awarded = await awardPoints(
        database,
        userId,
        rules.dailyLoginPoints,
        "daily_login",
        event.date,
        null,
        "Daily login",
      );
      if (awarded) pointsAwarded += rules.dailyLoginPoints;
      break;
    }
  }

  const totalPoints = await getTotalPoints(database, userId);
  const level = await updateUserLevel(
    database,
    userId,
    totalPoints,
    rules.levelThresholds,
  );
  const badges = await evaluateBadges(database, userId);

  return { pointsAwarded, totalPoints, level, badges };
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  rank: number;
}

export async function getLeaderboardEntries(
  database: DB,
  scope: "global" | "course",
  courseId?: number,
): Promise<LeaderboardEntry[]> {
  const conditions = [];
  if (scope === "course" && courseId != null) {
    conditions.push(eq(pointsLedger.courseId, courseId));
  }

  const rows = await database
    .select({
      userId: pointsLedger.userId,
      name: user.name,
      total: sql<number>`coalesce(sum(${pointsLedger.amount}), 0)::int`,
    })
    .from(pointsLedger)
    .innerJoin(user, eq(pointsLedger.userId, user.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(pointsLedger.userId, user.name)
    .orderBy(sql`sum(${pointsLedger.amount}) desc`)
    .limit(100);

  return rows.map((row, index) => ({
    userId: row.userId,
    name: row.name ?? "Learner",
    points: row.total,
    rank: index + 1,
  }));
}

export async function refreshLeaderboardSnapshot(
  database: DB,
  scope: "global" | "course",
  courseId?: number,
  period = "allTime",
) {
  const entries = await getLeaderboardEntries(database, scope, courseId);
  const [snapshot] = await database
    .insert(leaderboardSnapshots)
    .values({
      scope,
      courseId: courseId ?? null,
      period,
      entries,
    })
    .onConflictDoUpdate({
      target: [
        leaderboardSnapshots.scope,
        leaderboardSnapshots.courseId,
        leaderboardSnapshots.period,
      ],
      set: { entries, calculatedAt: new Date() },
    })
    .returning();
  return snapshot;
}
