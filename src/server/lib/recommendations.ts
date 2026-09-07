import { and, desc, eq, inArray, notInArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "~/server/db/schema";

export interface RecommendedCourse {
  id: number;
  title: string;
  slug: string | null;
  coverImageUrl: string | null;
  categoryName: string;
  score: number;
}

export async function getRecommendations(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
  limit = 5,
): Promise<RecommendedCourse[]> {
  const enrolledCourses = await db
    .select({ courseId: schema.enrollments.courseId })
    .from(schema.enrollments)
    .where(
      and(
        eq(schema.enrollments.userId, userId),
        eq(schema.enrollments.status, "active"),
      ),
    );

  const enrolledIds = enrolledCourses.map((e) => e.courseId);

  const enrolledCategories = await db
    .selectDistinct({ categoryId: schema.courses.categoryId })
    .from(schema.courses)
    .where(inArray(schema.courses.id, enrolledIds));

  const categoryIds = enrolledCategories.map((c) => c.categoryId);

  if (categoryIds.length === 0) {
    const fallback = await db
      .select({
        id: schema.courses.id,
        title: schema.courses.title,
        slug: schema.courses.slug,
        coverImageUrl: schema.courses.coverImageUrl,
        categoryName: schema.categories.name,
        createdAt: schema.courses.createdAt,
      })
      .from(schema.courses)
      .innerJoin(
        schema.categories,
        eq(schema.courses.categoryId, schema.categories.id),
      )
      .where(eq(schema.courses.status, "published"))
      .orderBy(desc(schema.courses.createdAt))
      .limit(limit);

    return fallback.map((course) => ({
      ...course,
      score: 0,
    }));
  }

  const candidates = await db
    .select({
      id: schema.courses.id,
      title: schema.courses.title,
      slug: schema.courses.slug,
      coverImageUrl: schema.courses.coverImageUrl,
      categoryId: schema.courses.categoryId,
      categoryName: schema.categories.name,
      createdAt: schema.courses.createdAt,
    })
    .from(schema.courses)
    .innerJoin(
      schema.categories,
      eq(schema.courses.categoryId, schema.categories.id),
    )
    .where(
      and(
        eq(schema.courses.status, "published"),
        inArray(schema.courses.categoryId, categoryIds),
        notInArray(schema.courses.id, enrolledIds),
      ),
    );

  const scored = candidates.map((course) => {
    let score = 100;
    if (categoryIds.includes(course.categoryId)) score += 50;
    const ageDays =
      (Date.now() - course.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    score -= Math.min(30, Math.floor(ageDays));
    return { ...course, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ categoryId: _, ...rest }) => rest);
}
