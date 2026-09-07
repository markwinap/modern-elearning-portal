import { and, desc, eq, gte, inArray, lte, max, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "~/server/db/schema";

export interface ContinueLearningItem {
  courseId: number;
  title: string;
  slug: string | null;
  coverImageUrl: string | null;
  progressPct: number;
  lastActivityAt: Date | null;
}

export interface DeadlineItem {
  id: number;
  type: "quiz" | "workshop" | "session";
  title: string;
  courseTitle: string;
  courseSlug: string | null;
  dueAt: Date;
  meta?: string | null;
}

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
  courseTitle: string;
  courseSlug: string | null;
}

export async function getContinueLearning(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
): Promise<ContinueLearningItem[]> {
  const enrollments = await db
    .select({
      courseId: schema.courses.id,
      title: schema.courses.title,
      slug: schema.courses.slug,
      coverImageUrl: schema.courses.coverImageUrl,
      enrolledAt: schema.enrollments.enrolledAt,
      progressPct: sql<number>`coalesce(${schema.courseProgress.progressPct}, 0)`,
    })
    .from(schema.enrollments)
    .innerJoin(
      schema.courses,
      eq(schema.enrollments.courseId, schema.courses.id),
    )
    .leftJoin(
      schema.courseProgress,
      and(
        eq(schema.courseProgress.courseId, schema.courses.id),
        eq(schema.courseProgress.userId, userId),
      ),
    )
    .where(
      and(
        eq(schema.enrollments.userId, userId),
        eq(schema.enrollments.status, "active"),
      ),
    );

  if (enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.courseId);

  const lastActivityRows = await db
    .select({
      courseId: schema.courseSections.courseId,
      lastActivityAt: max(schema.activityProgress.firstViewedAt),
    })
    .from(schema.activityProgress)
    .innerJoin(
      schema.activities,
      eq(schema.activityProgress.activityId, schema.activities.id),
    )
    .innerJoin(
      schema.courseSections,
      eq(schema.activities.sectionId, schema.courseSections.id),
    )
    .where(
      and(
        eq(schema.activityProgress.userId, userId),
        inArray(schema.courseSections.courseId, courseIds),
      ),
    )
    .groupBy(schema.courseSections.courseId);

  const lastActivityByCourse = new Map<number, Date | null>();
  for (const row of lastActivityRows) {
    lastActivityByCourse.set(row.courseId, row.lastActivityAt);
  }

  const withDates = enrollments.map((e) => ({
    courseId: e.courseId,
    title: e.title,
    slug: e.slug,
    coverImageUrl: e.coverImageUrl,
    progressPct: e.progressPct,
    enrolledAt: e.enrolledAt,
    lastActivityAt: lastActivityByCourse.get(e.courseId) ?? null,
  }));

  return withDates
    .sort((a, b) => {
      const aTime = a.lastActivityAt?.getTime() ?? a.enrolledAt.getTime();
      const bTime = b.lastActivityAt?.getTime() ?? b.enrolledAt.getTime();
      return bTime - aTime;
    })
    .slice(0, 6)
    .map(({ enrolledAt: _, ...rest }) => rest);
}

export async function getUpcomingDeadlines(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
): Promise<DeadlineItem[]> {
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const quizDeadlines = await db
    .select({
      id: schema.activities.id,
      title: schema.activities.title,
      courseTitle: schema.courses.title,
      courseSlug: schema.courses.slug,
      availableUntil: schema.quizzes.availableUntil,
    })
    .from(schema.quizzes)
    .innerJoin(
      schema.activities,
      eq(schema.quizzes.activityId, schema.activities.id),
    )
    .innerJoin(
      schema.courseSections,
      eq(schema.activities.sectionId, schema.courseSections.id),
    )
    .innerJoin(
      schema.courses,
      eq(schema.courseSections.courseId, schema.courses.id),
    )
    .innerJoin(
      schema.enrollments,
      and(
        eq(schema.enrollments.courseId, schema.courses.id),
        eq(schema.enrollments.userId, userId),
      ),
    )
    .where(
      and(
        eq(schema.enrollments.status, "active"),
        eq(schema.courses.status, "published"),
        gte(schema.quizzes.availableUntil, now),
        lte(schema.quizzes.availableUntil, twoWeeksFromNow),
      ),
    );

  const workshopDeadlines = await db
    .select({
      id: schema.activities.id,
      title: schema.activities.title,
      courseTitle: schema.courses.title,
      courseSlug: schema.courses.slug,
      submissionDeadline: schema.workshops.submissionDeadline,
      assessmentDeadline: schema.workshops.assessmentDeadline,
    })
    .from(schema.workshops)
    .innerJoin(
      schema.activities,
      eq(schema.workshops.activityId, schema.activities.id),
    )
    .innerJoin(
      schema.courseSections,
      eq(schema.activities.sectionId, schema.courseSections.id),
    )
    .innerJoin(
      schema.courses,
      eq(schema.courseSections.courseId, schema.courses.id),
    )
    .innerJoin(
      schema.enrollments,
      and(
        eq(schema.enrollments.courseId, schema.courses.id),
        eq(schema.enrollments.userId, userId),
      ),
    )
    .where(
      and(
        eq(schema.enrollments.status, "active"),
        eq(schema.courses.status, "published"),
        or(
          and(
            gte(schema.workshops.submissionDeadline, now),
            lte(schema.workshops.submissionDeadline, twoWeeksFromNow),
          ),
          and(
            gte(schema.workshops.assessmentDeadline, now),
            lte(schema.workshops.assessmentDeadline, twoWeeksFromNow),
          ),
        ),
      ),
    );

  const sessionDeadlines = await db
    .select({
      id: schema.courseSessions.id,
      courseTitle: schema.courses.title,
      courseSlug: schema.courses.slug,
      location: schema.courseSessions.location,
      classroom: schema.courseSessions.classroom,
      startDate: schema.courseSessions.startDate,
      startTime: schema.courseSessions.startTime,
    })
    .from(schema.courseSessions)
    .innerJoin(
      schema.courses,
      eq(schema.courseSessions.courseId, schema.courses.id),
    )
    .innerJoin(
      schema.enrollments,
      and(
        eq(schema.enrollments.courseId, schema.courses.id),
        eq(schema.enrollments.userId, userId),
      ),
    )
    .where(
      and(
        eq(schema.enrollments.status, "active"),
        eq(schema.courses.status, "published"),
        gte(
          schema.courseSessions.startDate,
          now.toISOString().split("T")[0] ?? "",
        ),
        lte(
          schema.courseSessions.startDate,
          twoWeeksFromNow.toISOString().split("T")[0] ?? "",
        ),
      ),
    );

  const items: DeadlineItem[] = [];

  for (const row of quizDeadlines) {
    if (!row.availableUntil) continue;
    items.push({
      id: row.id,
      type: "quiz",
      title: row.title,
      courseTitle: row.courseTitle,
      courseSlug: row.courseSlug,
      dueAt: row.availableUntil,
      meta: "Quiz due",
    });
  }

  for (const row of workshopDeadlines) {
    const dates: { label: string; date: Date | null }[] = [
      { label: "Submission due", date: row.submissionDeadline },
      { label: "Assessment due", date: row.assessmentDeadline },
    ];
    for (const { label, date } of dates) {
      if (!date || date < now || date > twoWeeksFromNow) continue;
      items.push({
        id: row.id,
        type: "workshop",
        title: row.title,
        courseTitle: row.courseTitle,
        courseSlug: row.courseSlug,
        dueAt: date,
        meta: label,
      });
    }
  }

  for (const row of sessionDeadlines) {
    const dueAt = new Date(`${row.startDate}T${row.startTime}`);
    if (isNaN(dueAt.getTime())) continue;
    items.push({
      id: row.id,
      type: "session",
      title: "On-site session",
      courseTitle: row.courseTitle,
      courseSlug: row.courseSlug,
      dueAt,
      meta: [row.location, row.classroom].filter(Boolean).join(" · ") || null,
    });
  }

  return items
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, 5);
}

export async function getRecentAnnouncements(
  db: PostgresJsDatabase<typeof schema>,
  userId: string,
): Promise<AnnouncementItem[]> {
  return db
    .select({
      id: schema.announcements.id,
      title: schema.announcements.title,
      content: schema.announcements.content,
      createdAt: schema.announcements.createdAt,
      courseTitle: schema.courses.title,
      courseSlug: schema.courses.slug,
    })
    .from(schema.announcements)
    .innerJoin(
      schema.courses,
      eq(schema.announcements.courseId, schema.courses.id),
    )
    .innerJoin(
      schema.enrollments,
      and(
        eq(schema.enrollments.courseId, schema.courses.id),
        eq(schema.enrollments.userId, userId),
      ),
    )
    .where(eq(schema.enrollments.status, "active"))
    .orderBy(desc(schema.announcements.createdAt))
    .limit(5);
}
