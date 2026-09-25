import { and, eq } from "drizzle-orm";

import type { db } from "~/server/db";
import {
  activities,
  activityProgress,
  activityReleaseRules,
  courseSections,
  enrollments,
  grades,
  sectionReleaseRules,
} from "~/server/db/schema";

export type ReleaseRule =
  | { type: "date"; releaseAt: Date }
  | { type: "enrollment_offset"; offsetDays: number }
  | { type: "activity_completion"; prerequisiteActivityId: number }
  | {
      type: "prerequisite_score";
      prerequisiteActivityId: number;
      minimumScore: number;
    }
  | { type: "manual"; manuallyReleased: boolean };

export interface ReleaseContext {
  now: Date;
  enrolledAt: Date | null;
  completedActivityIds: ReadonlySet<number>;
  activityScores: ReadonlyMap<number, number>;
}

export interface ReleaseEvaluation {
  released: boolean;
  reason: string | null;
}

export function evaluateReleaseRules(
  rules: readonly ReleaseRule[],
  context: ReleaseContext,
): ReleaseEvaluation {
  for (const rule of rules) {
    if (rule.type === "date" && context.now < rule.releaseAt) {
      return {
        released: false,
        reason: `Available ${rule.releaseAt.toLocaleString()}`,
      };
    }
    if (rule.type === "enrollment_offset") {
      if (!context.enrolledAt)
        return { released: false, reason: "Available after enrollment" };
      const releaseAt = new Date(context.enrolledAt);
      releaseAt.setUTCDate(releaseAt.getUTCDate() + rule.offsetDays);
      if (context.now < releaseAt)
        return {
          released: false,
          reason: `Available ${rule.offsetDays} day${rule.offsetDays === 1 ? "" : "s"} after enrollment`,
        };
    }
    if (
      rule.type === "activity_completion" &&
      !context.completedActivityIds.has(rule.prerequisiteActivityId)
    ) {
      return { released: false, reason: "Complete the prerequisite activity" };
    }
    if (
      rule.type === "prerequisite_score" &&
      (context.activityScores.get(rule.prerequisiteActivityId) ?? -1) <
        rule.minimumScore
    ) {
      return {
        released: false,
        reason: `Score at least ${rule.minimumScore}% on the prerequisite activity`,
      };
    }
    if (rule.type === "manual" && !rule.manuallyReleased) {
      return { released: false, reason: "Waiting for instructor release" };
    }
  }
  return { released: true, reason: null };
}

type Database = typeof db;
type StoredRule =
  | typeof sectionReleaseRules.$inferSelect
  | typeof activityReleaseRules.$inferSelect;

function normalizeRules(rows: readonly StoredRule[]): ReleaseRule[] {
  const rules: ReleaseRule[] = [];
  for (const row of rows) {
    if (row.type === "date" && row.releaseAt)
      rules.push({ type: "date", releaseAt: row.releaseAt });
    else if (row.type === "enrollment_offset" && row.offsetDays !== null)
      rules.push({ type: "enrollment_offset", offsetDays: row.offsetDays });
    else if (
      row.type === "activity_completion" &&
      row.prerequisiteActivityId !== null
    )
      rules.push({
        type: "activity_completion",
        prerequisiteActivityId: row.prerequisiteActivityId,
      });
    else if (
      row.type === "prerequisite_score" &&
      row.prerequisiteActivityId !== null &&
      row.minimumScore !== null
    )
      rules.push({
        type: "prerequisite_score",
        prerequisiteActivityId: row.prerequisiteActivityId,
        minimumScore: row.minimumScore,
      });
    else if (row.type === "manual")
      rules.push({ type: "manual", manuallyReleased: row.manuallyReleased });
  }
  return rules;
}

async function getContext(
  database: Database,
  userId: string,
  courseId: number,
): Promise<ReleaseContext> {
  const [[enrollment], completed, scores] = await Promise.all([
    database
      .select({ enrolledAt: enrollments.enrolledAt })
      .from(enrollments)
      .where(
        and(eq(enrollments.courseId, courseId), eq(enrollments.userId, userId)),
      )
      .limit(1),
    database
      .select({ activityId: activityProgress.activityId })
      .from(activityProgress)
      .innerJoin(activities, eq(activityProgress.activityId, activities.id))
      .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
      .where(
        and(
          eq(courseSections.courseId, courseId),
          eq(activityProgress.userId, userId),
          eq(activityProgress.status, "completed"),
        ),
      ),
    database
      .select({ activityId: grades.activityId, percentage: grades.percentage })
      .from(grades)
      .innerJoin(activities, eq(grades.activityId, activities.id))
      .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
      .where(
        and(eq(courseSections.courseId, courseId), eq(grades.userId, userId)),
      ),
  ]);
  return {
    now: new Date(),
    enrolledAt: enrollment?.enrolledAt ?? null,
    completedActivityIds: new Set(completed.map((row) => row.activityId)),
    activityScores: new Map(
      scores
        .filter((row) => row.percentage !== null)
        .map((row) => [row.activityId, row.percentage ?? 0]),
    ),
  };
}

export async function getCourseReleaseState(
  database: Database,
  userId: string,
  courseId: number,
) {
  const [sections, sectionRules, activityRules, context] = await Promise.all([
    database
      .select({ sectionId: courseSections.id, activityId: activities.id })
      .from(courseSections)
      .leftJoin(activities, eq(activities.sectionId, courseSections.id))
      .where(eq(courseSections.courseId, courseId)),
    database
      .select()
      .from(sectionReleaseRules)
      .innerJoin(
        courseSections,
        eq(sectionReleaseRules.sectionId, courseSections.id),
      )
      .where(eq(courseSections.courseId, courseId))
      .then((rows) => rows.map((row) => row.section_release_rule)),
    database
      .select()
      .from(activityReleaseRules)
      .innerJoin(activities, eq(activityReleaseRules.activityId, activities.id))
      .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
      .where(eq(courseSections.courseId, courseId))
      .then((rows) => rows.map((row) => row.activity_release_rule)),
    getContext(database, userId, courseId),
  ]);
  const sectionState = new Map<number, ReleaseEvaluation>();
  const activityState = new Map<number, ReleaseEvaluation>();
  for (const row of sections) {
    if (!sectionState.has(row.sectionId))
      sectionState.set(
        row.sectionId,
        evaluateReleaseRules(
          normalizeRules(
            sectionRules.filter((rule) => rule.sectionId === row.sectionId),
          ),
          context,
        ),
      );
    if (row.activityId !== null) {
      const sectionResult = sectionState.get(row.sectionId) ?? {
        released: true,
        reason: null,
      };
      activityState.set(
        row.activityId,
        sectionResult.released
          ? evaluateReleaseRules(
              normalizeRules(
                activityRules.filter(
                  (rule) => rule.activityId === row.activityId,
                ),
              ),
              context,
            )
          : sectionResult,
      );
    }
  }
  return { sections: sectionState, activities: activityState };
}
