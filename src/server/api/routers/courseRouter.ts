import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  activities,
  courseProgress,
  courseSections,
  courseSessions,
  courses,
  enrollments,
  grades,
  user,
} from "~/server/db/schema";

import { courseSessionRouter } from "./courseSessionRouter";

const courseInputSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  categoryId: z.number().int(),
  coverImageUrl: z.string().url().optional(),
  maxEnrollments: z.number().int().positive().optional(),
  locationType: z.enum(["online", "onsite"]),
  siteLocation: z.string().optional(),
  classroom: z.string().optional(),
  instructorBio: z.string().optional(),
  teacherId: z.string().optional(),
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
  accessKey: z.string().max(64).optional(),
});

export const courseRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(12),
        categoryId: z.number().int().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      const conditions = [eq(courses.status, "published")];
      if (input.categoryId)
        conditions.push(eq(courses.categoryId, input.categoryId));
      if (input.search)
        conditions.push(ilike(courses.title, `%${input.search}%`));

      return ctx.db
        .select({
          id: courses.id,
          title: courses.title,
          description: courses.description,
          coverImageUrl: courses.coverImageUrl,
          slug: courses.slug,
          locationType: courses.locationType,
          siteLocation: courses.siteLocation,
          createdAt: courses.createdAt,
          teacherName: user.name,
        })
        .from(courses)
        .leftJoin(user, eq(courses.teacherId, user.id))
        .where(and(...conditions))
        .orderBy(desc(courses.createdAt))
        .limit(input.limit)
        .offset(offset);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select()
        .from(courses)
        .where(eq(courses.slug, input.slug))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });

      const [teacher] = await ctx.db
        .select({
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, course.teacherId))
        .limit(1);

      const sessions = await ctx.db
        .select()
        .from(courseSessions)
        .where(eq(courseSessions.courseId, course.id))
        .orderBy(asc(courseSessions.dayOfWeek), asc(courseSessions.startTime));

      return {
        ...course,
        teacherName: teacher?.name ?? null,
        teacherEmail: teacher?.email ?? null,
        teacherImage: teacher?.image ?? null,
        sessions,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select()
        .from(courses)
        .where(eq(courses.id, input.id))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });

      const sessions = await ctx.db
        .select()
        .from(courseSessions)
        .where(eq(courseSessions.courseId, course.id))
        .orderBy(asc(courseSessions.dayOfWeek), asc(courseSessions.startTime));

      return { ...course, sessions };
    }),

  getMyCourses: teacherProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(courses)
      .where(eq(courses.teacherId, ctx.session.user.id))
      .orderBy(desc(courses.createdAt));
  }),

  create: teacherProcedure
    .input(courseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const slug =
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Date.now().toString(36);

      const [course] = await ctx.db
        .insert(courses)
        .values({
          ...input,
          slug,
          teacherId: ctx.session.user.id,
          status: "draft",
        })
        .returning();
      return course;
    }),

  update: protectedProcedure
    .input(courseInputSchema.partial().extend({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [existing] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, existing.teacherId);

      if (data.teacherId && data.teacherId !== existing.teacherId) {
        if (ctx.session.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can reassign course teachers",
          });
        }
        const [teacher] = await ctx.db
          .select({ role: user.role })
          .from(user)
          .where(eq(user.id, data.teacherId))
          .limit(1);
        if (
          !teacher ||
          (teacher.role !== "teacher" && teacher.role !== "admin")
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid teacher selected",
          });
        }
      }

      await ctx.db.update(courses).set(data).where(eq(courses.id, id));
    }),

  publish: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, existing.teacherId);
      await ctx.db
        .update(courses)
        .set({ status: "published" })
        .where(eq(courses.id, input.id));
    }),

  archive: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(courses)
        .set({ status: "archived" })
        .where(eq(courses.id, input.id));
    }),

  session: courseSessionRouter,

  getEnrollmentCount: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(eq(enrollments.courseId, input.courseId));
      return result?.count ?? 0;
    }),

  /** Course-level insights: enrollment, completion, progress, and grades. */
  getCourseInsights: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);

      const [enrollmentResult] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(eq(enrollments.courseId, input.courseId));
      const enrollmentCount = enrollmentResult?.count ?? 0;

      const progressRows = await ctx.db
        .select({
          progressPct: courseProgress.progressPct,
          completedAt: courseProgress.completedAt,
        })
        .from(courseProgress)
        .where(eq(courseProgress.courseId, input.courseId));
      const completedCount = progressRows.filter(
        (r) => r.completedAt != null,
      ).length;
      const averageProgress =
        progressRows.length > 0
          ? progressRows.reduce((sum, r) => sum + r.progressPct, 0) /
            progressRows.length
          : 0;

      const gradeRows = await ctx.db
        .select({ percentage: grades.percentage })
        .from(grades)
        .innerJoin(activities, eq(grades.activityId, activities.id))
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .where(eq(courseSections.courseId, input.courseId));
      const gradePercentages = gradeRows
        .map((g) => g.percentage)
        .filter((p): p is number => p != null);
      const averageGrade =
        gradePercentages.length > 0
          ? gradePercentages.reduce((sum, p) => sum + p, 0) /
            gradePercentages.length
          : 0;

      const gradeDistribution = [0, 20, 40, 60, 80].map((bucket) => ({
        bucket,
        count: gradePercentages.filter((p) => {
          const lower = bucket;
          const upper = bucket + 20;
          return p >= lower && (bucket === 80 ? p <= upper : p < upper);
        }).length,
      }));

      return {
        enrollmentCount,
        completedCount,
        completionRate:
          enrollmentCount > 0 ? completedCount / enrollmentCount : 0,
        averageProgress,
        averageGrade,
        gradeDistribution,
      };
    }),

  listAll: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      return ctx.db
        .select({
          id: courses.id,
          title: courses.title,
          slug: courses.slug,
          status: courses.status,
          locationType: courses.locationType,
          siteLocation: courses.siteLocation,
          createdAt: courses.createdAt,
          teacherName: user.name,
        })
        .from(courses)
        .leftJoin(user, eq(courses.teacherId, user.id))
        .orderBy(desc(courses.createdAt))
        .limit(input.limit)
        .offset(offset);
    }),
});
