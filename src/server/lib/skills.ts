import {
  and,
  eq,
  inArray,
  sql,
  type ExtractTablesWithRelations,
} from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import type { db } from "~/server/db";
import type * as schema from "~/server/db/schema";
import {
  courseProgress,
  courses,
  learningPaths,
  pathCourses,
  pathEnrollments,
  pathSkillTargets,
  skills,
  userSkills,
  courseSkills,
} from "~/server/db/schema";

type Database =
  | typeof db
  | PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;

export interface SkillGap {
  skillId: number;
  skillName: string;
  currentScore: number;
  targetScore: number;
  gap: number;
  recommendedCourseIds: number[];
}

export async function updateUserSkillOnCourseCompletion(
  database: Database,
  userId: string,
  courseId: number,
): Promise<number[]> {
  const mappedSkills = await database
    .select({ skillId: courseSkills.skillId, weight: courseSkills.weight })
    .from(courseSkills)
    .where(eq(courseSkills.courseId, courseId));

  const updatedSkillIds: number[] = [];
  const now = new Date();
  for (const row of mappedSkills) {
    const [existing] = await database
      .select({ id: userSkills.id, score: userSkills.score })
      .from(userSkills)
      .where(
        and(eq(userSkills.userId, userId), eq(userSkills.skillId, row.skillId)),
      )
      .limit(1);
    const score = Math.min(100, (existing?.score ?? 0) + row.weight);
    if (existing) {
      await database
        .update(userSkills)
        .set({ score, evidenceCourseId: courseId, attainedAt: now })
        .where(eq(userSkills.id, existing.id));
    } else {
      await database.insert(userSkills).values({
        userId,
        skillId: row.skillId,
        score,
        evidenceCourseId: courseId,
        attainedAt: now,
      });
    }
    updatedSkillIds.push(row.skillId);
  }
  return updatedSkillIds;
}

export async function getSkillGaps(database: Database, userId: string) {
  const allSkills = await database
    .select({ id: skills.id, name: skills.name })
    .from(skills);

  const userSkillRows = await database
    .select({ skillId: userSkills.skillId, score: userSkills.score })
    .from(userSkills)
    .where(eq(userSkills.userId, userId));
  const userScoreBySkill = new Map(
    userSkillRows.map((r) => [r.skillId, r.score]),
  );

  const courseSkillRows = await database
    .select({ courseId: courseSkills.courseId, skillId: courseSkills.skillId })
    .from(courseSkills)
    .where(
      inArray(
        courseSkills.skillId,
        allSkills.map((s) => s.id),
      ),
    );
  const coursesBySkill = new Map<number, number[]>();
  for (const row of courseSkillRows) {
    const list = coursesBySkill.get(row.skillId) ?? [];
    list.push(row.courseId);
    coursesBySkill.set(row.skillId, list);
  }

  const gaps: SkillGap[] = [];
  for (const skill of allSkills) {
    const current = userScoreBySkill.get(skill.id) ?? 0;
    const targetRow = await database
      .select({ targetLevel: pathSkillTargets.targetLevel })
      .from(pathSkillTargets)
      .where(eq(pathSkillTargets.skillId, skill.id))
      .orderBy(sql`${pathSkillTargets.targetLevel} desc`)
      .limit(1);
    const target = targetRow[0]?.targetLevel ?? 100;
    const gap = Math.max(0, target - current);
    if (gap > 0) {
      gaps.push({
        skillId: skill.id,
        skillName: skill.name,
        currentScore: current,
        targetScore: target,
        gap,
        recommendedCourseIds: coursesBySkill.get(skill.id) ?? [],
      });
    }
  }
  return gaps;
}

export async function getPathProgress(
  database: Database,
  pathId: number,
  userId: string,
) {
  const items = await database
    .select({
      id: pathCourses.id,
      courseId: pathCourses.courseId,
      order: pathCourses.order,
      prerequisiteCourseId: pathCourses.prerequisiteCourseId,
      requiredScore: pathCourses.requiredScore,
      title: courses.title,
      slug: courses.slug,
    })
    .from(pathCourses)
    .innerJoin(courses, eq(pathCourses.courseId, courses.id))
    .where(eq(pathCourses.pathId, pathId))
    .orderBy(pathCourses.order);

  const courseIds = items.map((i) => i.courseId);
  const progressRows = courseIds.length
    ? await database
        .select({
          courseId: courseProgress.courseId,
          progressPct: courseProgress.progressPct,
          completedAt: courseProgress.completedAt,
        })
        .from(courseProgress)
        .where(
          and(
            eq(courseProgress.userId, userId),
            inArray(courseProgress.courseId, courseIds),
          ),
        )
    : [];
  const progressByCourse = new Map(progressRows.map((r) => [r.courseId, r]));

  let completedCount = 0;
  const steps = items.map((item) => {
    const progress = progressByCourse.get(item.courseId);
    const pct = progress?.progressPct ?? 0;
    const isCompleted = pct >= 100;
    if (isCompleted) completedCount++;
    const prerequisiteCompleted = item.prerequisiteCourseId
      ? (progressByCourse.get(item.prerequisiteCourseId)?.progressPct ?? 0) >=
        100
      : true;
    const scoreOk = item.requiredScore ? pct >= item.requiredScore : true;
    return {
      ...item,
      progressPct: pct,
      isCompleted,
      isLocked: !(prerequisiteCompleted && scoreOk),
    };
  });

  const totalPct =
    items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  return { steps, totalPct };
}

export async function recalcPathEnrollment(
  database: Database,
  pathId: number,
  userId: string,
) {
  const [path] = await database
    .select({ status: learningPaths.status })
    .from(learningPaths)
    .where(eq(learningPaths.id, pathId))
    .limit(1);
  if (path?.status !== "published") return null;

  const { totalPct } = await getPathProgress(database, pathId, userId);
  const [enrollment] = await database
    .select({
      id: pathEnrollments.id,
      completedAt: pathEnrollments.completedAt,
    })
    .from(pathEnrollments)
    .where(
      and(
        eq(pathEnrollments.pathId, pathId),
        eq(pathEnrollments.userId, userId),
      ),
    )
    .limit(1);

  const completedAt = totalPct >= 100 ? new Date() : null;
  if (enrollment) {
    await database
      .update(pathEnrollments)
      .set({ progressPct: totalPct, completedAt })
      .where(eq(pathEnrollments.id, enrollment.id));
  } else {
    await database
      .insert(pathEnrollments)
      .values({ pathId, userId, progressPct: totalPct, completedAt })
      .onConflictDoNothing();
  }
  return totalPct;
}
