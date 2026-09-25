import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import type { db } from "~/server/db";
import {
  courses,
  learningPaths,
  pathCourses,
  pathEnrollments,
  pathSkillTargets,
  skills,
} from "~/server/db/schema";
import { getPathProgress, recalcPathEnrollment } from "~/server/lib/skills";

type Database = typeof db;

const pathInputSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  targetRole: z.string().max(128).optional(),
  courseIds: z.array(z.number().int()).default([]),
  skillTargets: z.record(z.number().int().min(0).max(100)).default({}),
});

export const learningPathRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: learningPaths.id,
        title: learningPaths.title,
        description: learningPaths.description,
        status: learningPaths.status,
        targetRole: learningPaths.targetRole,
        createdAt: learningPaths.createdAt,
      })
      .from(learningPaths)
      .where(eq(learningPaths.status, "published"))
      .orderBy(asc(learningPaths.title));
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [path] = await ctx.db
        .select()
        .from(learningPaths)
        .where(eq(learningPaths.id, input.id))
        .limit(1);
      if (!path) throw new TRPCError({ code: "NOT_FOUND" });
      const coursesInPath = await ctx.db
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
        .where(eq(pathCourses.pathId, input.id))
        .orderBy(pathCourses.order);
      const skillTargets = await ctx.db
        .select({
          skillId: skills.id,
          name: skills.name,
          targetLevel: pathSkillTargets.targetLevel,
        })
        .from(pathSkillTargets)
        .innerJoin(skills, eq(pathSkillTargets.skillId, skills.id))
        .where(eq(pathSkillTargets.pathId, input.id));
      return { path, courses: coursesInPath, skillTargets };
    }),

  create: adminProcedure
    .input(pathInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { courseIds, skillTargets, ...base } = input;
      const [path] = await ctx.db
        .insert(learningPaths)
        .values({ ...base, createdBy: ctx.session.user.id })
        .returning();
      if (!path) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await insertPathCourses(ctx.db, path.id, courseIds);
      await insertPathSkillTargets(ctx.db, path.id, skillTargets);
      return path;
    }),

  update: adminProcedure
    .input(pathInputSchema.extend({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const { id, courseIds, skillTargets, ...base } = input;
      const [path] = await ctx.db
        .update(learningPaths)
        .set(base)
        .where(eq(learningPaths.id, id))
        .returning();
      if (!path) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.delete(pathCourses).where(eq(pathCourses.pathId, id));
      await ctx.db
        .delete(pathSkillTargets)
        .where(eq(pathSkillTargets.pathId, id));
      await insertPathCourses(ctx.db, id, courseIds);
      await insertPathSkillTargets(ctx.db, id, skillTargets);
      return path;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(learningPaths).where(eq(learningPaths.id, input.id));
    }),

  myPaths: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: learningPaths.id,
        title: learningPaths.title,
        description: learningPaths.description,
        targetRole: learningPaths.targetRole,
        progressPct: pathEnrollments.progressPct,
        completedAt: pathEnrollments.completedAt,
      })
      .from(pathEnrollments)
      .innerJoin(learningPaths, eq(pathEnrollments.pathId, learningPaths.id))
      .where(eq(pathEnrollments.userId, ctx.session.user.id))
      .orderBy(desc(pathEnrollments.startedAt));
    return rows;
  }),

  join: protectedProcedure
    .input(z.object({ pathId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [path] = await ctx.db
        .select({ status: learningPaths.status })
        .from(learningPaths)
        .where(eq(learningPaths.id, input.pathId))
        .limit(1);
      if (!path) throw new TRPCError({ code: "NOT_FOUND" });
      if (path.status !== "published")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Path is not published",
        });
      await ctx.db
        .insert(pathEnrollments)
        .values({ pathId: input.pathId, userId: ctx.session.user.id })
        .onConflictDoNothing();
      return { success: true };
    }),

  myProgress: protectedProcedure
    .input(z.object({ pathId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const { steps, totalPct } = await getPathProgress(
        ctx.db,
        input.pathId,
        ctx.session.user.id,
      );
      await recalcPathEnrollment(ctx.db, input.pathId, ctx.session.user.id);
      return { steps, totalPct };
    }),

  getGapAnalysis: protectedProcedure.query(async ({ ctx }) => {
    const { getSkillGaps } = await import("~/server/lib/skills");
    const gaps = await getSkillGaps(ctx.db, ctx.session.user.id);
    return gaps;
  }),

  getRecommendations: protectedProcedure.query(async ({ ctx }) => {
    const [{ getSkillGaps }, coursesList] = await Promise.all([
      import("~/server/lib/skills"),
      ctx.db
        .select({
          id: courses.id,
          title: courses.title,
          slug: courses.slug,
          description: courses.description,
        })
        .from(courses)
        .where(eq(courses.status, "published")),
    ]);
    const gaps = await getSkillGaps(ctx.db, ctx.session.user.id);
    const courseIds = new Set(gaps.flatMap((g) => g.recommendedCourseIds));
    const recommendations = coursesList.filter((c) => courseIds.has(c.id));
    return { gaps, recommendations };
  }),
});

async function insertPathCourses(
  database: Database,
  pathId: number,
  courseIds: number[],
) {
  if (courseIds.length === 0) return;
  await database
    .insert(pathCourses)
    .values(
      courseIds.map((courseId, index) => ({ pathId, courseId, order: index })),
    );
}

async function insertPathSkillTargets(
  database: Database,
  pathId: number,
  skillTargets: Record<string, number>,
) {
  const entries = Object.entries(skillTargets).filter(([, v]) => v > 0);
  if (entries.length === 0) return;
  await database.insert(pathSkillTargets).values(
    entries.map(([skillId, targetLevel]) => ({
      pathId,
      skillId: Number(skillId),
      targetLevel,
    })),
  );
}
