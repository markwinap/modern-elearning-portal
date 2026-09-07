import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "~/server/db/schema";

export type SearchResultType = "course" | "activity" | "discussion" | "wiki";

export interface SearchFilters {
  query: string;
  types?: SearchResultType[];
  categoryId?: number;
  instructorId?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: number;
  type: SearchResultType;
  title: string;
  excerpt: string | null;
  url: string;
  courseSlug: string | null;
  courseTitle: string | null;
  rank: number;
}

type RawSearchRow = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  course_slug: string | null;
  course_title: string | null;
  thread_id: number | null;
  author_id: string | null;
  category_id: number | null;
  rank: number;
  total_count: number;
  [key: string]: unknown;
};

const allowedTypes: SearchResultType[] = [
  "course",
  "activity",
  "discussion",
  "wiki",
];

function buildTsQuery(query: string) {
  const normalized = query
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return sql`plainto_tsquery('english', ${normalized})`;
}

function buildTypeFilter(types?: SearchResultType[]) {
  const selected = (types ?? allowedTypes).filter((t) =>
    allowedTypes.includes(t),
  );
  if (selected.length === allowedTypes.length) return sql`true`;
  const literals = selected.map((t) => sql.raw(`'${t}'::text`));
  return sql`type IN (${sql.join(literals, sql`, `)})`;
}

function buildCategoryFilter(categoryId?: number) {
  if (!categoryId) return sql`true`;
  return sql`category_id = ${categoryId}`;
}

function buildInstructorFilter(instructorId?: string) {
  if (!instructorId) return sql`true`;
  return sql`author_id = ${instructorId}`;
}

function buildUrl(row: RawSearchRow): string {
  const slug = row.course_slug ?? "";
  switch (row.type) {
    case "course":
      return slug ? `/courses/${slug}` : "#";
    case "activity":
      return slug ? `/courses/${slug}/learn/${row.id}` : "#";
    case "discussion": {
      const threadId = row.thread_id ?? row.id;
      return slug ? `/courses/${slug}/discussions?threadId=${threadId}` : "#";
    }
    case "wiki":
      return slug ? `/courses/${slug}/learn/${row.id}` : "#";
    default:
      return "#";
  }
}

function excerpt(body: string | null): string | null {
  if (!body) return null;
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  return `${text.slice(0, 157)}...`;
}

export async function search(
  db: PostgresJsDatabase<typeof schema>,
  filters: SearchFilters,
): Promise<{ results: SearchResult[]; totalCount: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.max(1, Math.min(50, filters.limit ?? 10));
  const offset = (page - 1) * limit;

  const tsq = buildTsQuery(filters.query);
  const typeFilter = buildTypeFilter(filters.types);
  const categoryFilter = buildCategoryFilter(filters.categoryId);
  const instructorFilter = buildInstructorFilter(filters.instructorId);

  const query = sql`
    WITH tsq AS (SELECT ${tsq} AS q),
    candidates AS (
      SELECT
        c.id,
        'course'::text AS type,
        c.title,
        c.description AS body,
        c.slug AS course_slug,
        c.title AS course_title,
        NULL::integer AS thread_id,
        c."teacherId" AS author_id,
        c."categoryId" AS category_id,
        ts_rank_cd(c.search_vector, tsq.q) AS rank
      FROM "pg-drizzle_course" c, tsq
      WHERE c.search_vector @@ tsq.q AND c.status = 'published'

      UNION ALL

      SELECT
        a.id,
        'activity'::text AS type,
        a.title,
        NULL::text AS body,
        courses.slug AS course_slug,
        courses.title AS course_title,
        NULL::integer AS thread_id,
        courses."teacherId" AS author_id,
        courses."categoryId" AS category_id,
        ts_rank_cd(a.search_vector, tsq.q) AS rank
      FROM "pg-drizzle_activity" a
      JOIN "pg-drizzle_course_section" cs ON a."sectionId" = cs.id
      JOIN "pg-drizzle_course" courses ON cs."courseId" = courses.id, tsq
      WHERE a.search_vector @@ tsq.q
        AND a.visible = true
        AND cs.visible = true
        AND courses.status = 'published'

      UNION ALL

      SELECT
        mt.id,
        'discussion'::text AS type,
        mt.subject AS title,
        NULL::text AS body,
        courses.slug AS course_slug,
        courses.title AS course_title,
        mt.id AS thread_id,
        courses."teacherId" AS author_id,
        courses."categoryId" AS category_id,
        ts_rank_cd(mt.search_vector, tsq.q) AS rank
      FROM "pg-drizzle_message_thread" mt
      JOIN "pg-drizzle_course" courses ON mt."courseId" = courses.id, tsq
      WHERE mt.search_vector @@ tsq.q
        AND courses.status = 'published'

      UNION ALL

      SELECT
        m.id,
        'discussion'::text AS type,
        'Message'::text AS title,
        m.content AS body,
        courses.slug AS course_slug,
        courses.title AS course_title,
        m."threadId",
        courses."teacherId" AS author_id,
        courses."categoryId" AS category_id,
        ts_rank_cd(m.search_vector, tsq.q) AS rank
      FROM "pg-drizzle_message" m
      JOIN "pg-drizzle_message_thread" mt ON m."threadId" = mt.id
      JOIN "pg-drizzle_course" courses ON mt."courseId" = courses.id, tsq
      WHERE m.search_vector @@ tsq.q
        AND courses.status = 'published'

      UNION ALL

      SELECT
        wp."activityId" AS id,
        'wiki'::text AS type,
        wp.title,
        wp.content AS body,
        courses.slug AS course_slug,
        courses.title AS course_title,
        NULL::integer AS thread_id,
        courses."teacherId" AS author_id,
        courses."categoryId" AS category_id,
        ts_rank_cd(wp.search_vector, tsq.q) AS rank
      FROM "pg-drizzle_wiki_page" wp
      JOIN "pg-drizzle_activity" a ON wp."activityId" = a.id
      JOIN "pg-drizzle_course_section" cs ON a."sectionId" = cs.id
      JOIN "pg-drizzle_course" courses ON cs."courseId" = courses.id, tsq
      WHERE wp.search_vector @@ tsq.q
        AND a.visible = true
        AND cs.visible = true
        AND courses.status = 'published'
    )
    SELECT
      candidates.*,
      count(*) OVER()::int AS total_count
    FROM candidates
    WHERE ${typeFilter}
      AND ${categoryFilter}
      AND ${instructorFilter}
    ORDER BY rank DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  const rows = await db.execute<RawSearchRow>(query);

  let totalCount = 0;
  const results: SearchResult[] = [];

  for (const row of rows) {
    if (totalCount === 0) totalCount = row.total_count;
    const safeType = allowedTypes.includes(row.type as SearchResultType)
      ? (row.type as SearchResultType)
      : "course";
    results.push({
      id: row.id,
      type: safeType,
      title: row.title,
      excerpt: excerpt(row.body),
      url: buildUrl(row),
      courseSlug: row.course_slug,
      courseTitle: row.course_title,
      rank: row.rank,
    });
  }

  return { results, totalCount };
}
