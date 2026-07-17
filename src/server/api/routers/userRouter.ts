import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  activities,
  activityProgress,
  courseSections,
  courses,
  enrollments,
  grades,
  user,
} from "~/server/db/schema";

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

  /** Student dashboard counters for the currently authenticated user. */
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const role =
      (ctx.session.user.role as "student" | "teacher" | "admin") ?? "student";

    if (role === "admin") {
      const [
        usersResult,
        coursesResult,
        enrollmentsResult,
        completedActivitiesResult,
      ] = await Promise.all([
        ctx.db.select({ count: sql<number>`count(*)::int` }).from(user),
        ctx.db.select({ count: sql<number>`count(*)::int` }).from(courses),
        ctx.db.select({ count: sql<number>`count(*)::int` }).from(enrollments),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(activityProgress)
          .where(eq(activityProgress.status, "completed")),
      ]);

      return {
        role,
        users: usersResult?.[0]?.count ?? 0,
        courses: coursesResult?.[0]?.count ?? 0,
        enrollments: enrollmentsResult?.[0]?.count ?? 0,
        completedActivities: completedActivitiesResult?.[0]?.count ?? 0,
      };
    }

    if (role === "teacher") {
      const [
        teachingCoursesResult,
        publishedCoursesResult,
        activeStudentsResult,
      ] = await Promise.all([
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(courses)
          .where(eq(courses.teacherId, ctx.session.user.id)),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(courses)
          .where(
            and(
              eq(courses.teacherId, ctx.session.user.id),
              eq(courses.status, "published"),
            ),
          ),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(enrollments)
          .innerJoin(courses, eq(enrollments.courseId, courses.id))
          .where(
            and(
              eq(courses.teacherId, ctx.session.user.id),
              eq(enrollments.role, "student"),
              eq(enrollments.status, "active"),
            ),
          ),
      ]);

      const teachingCourses = teachingCoursesResult?.[0]?.count ?? 0;
      const activeStudents = activeStudentsResult?.[0]?.count ?? 0;

      return {
        role,
        teachingCourses,
        publishedCourses: publishedCoursesResult?.[0]?.count ?? 0,
        activeStudents,
        avgStudentsPerCourse:
          teachingCourses > 0
            ? Math.round((activeStudents / teachingCourses) * 10) / 10
            : 0,
      };
    }

    const [
      enrolledCoursesResult,
      completedActivitiesResult,
      timeSpentResult,
      averageGradeResult,
    ] = await Promise.all([
      ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.userId, ctx.session.user.id),
            eq(enrollments.status, "active"),
          ),
        ),
      ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityProgress)
        .where(
          and(
            eq(activityProgress.userId, ctx.session.user.id),
            eq(activityProgress.status, "completed"),
          ),
        ),
      ctx.db
        .select({
          seconds: sql<number>`coalesce(sum(${activityProgress.timeSpentSecs}), 0)::int`,
        })
        .from(activityProgress)
        .where(eq(activityProgress.userId, ctx.session.user.id)),
      ctx.db
        .select({
          average: sql<number | null>`avg(${grades.percentage})::float`,
        })
        .from(grades)
        .innerJoin(activities, eq(grades.activityId, activities.id))
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .where(
          and(
            eq(grades.userId, ctx.session.user.id),
            eq(activities.gradable, true),
            eq(courseSections.gradable, true),
            isNotNull(grades.percentage),
          ),
        ),
    ]);

    const totalSeconds = timeSpentResult?.[0]?.seconds ?? 0;
    const hoursLearned = Math.round((totalSeconds / 3600) * 10) / 10;
    const averageGradeRaw = averageGradeResult?.[0]?.average ?? null;

    return {
      role,
      enrolledCourses: enrolledCoursesResult?.[0]?.count ?? 0,
      completedActivities: completedActivitiesResult?.[0]?.count ?? 0,
      hoursLearned,
      averageGrade:
        averageGradeRaw === null
          ? null
          : Math.round(Number(averageGradeRaw) * 10) / 10,
    };
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

  /** List teachers/admins for course assignment. */
  listTeachers: teacherProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(inArray(user.role, ["teacher", "admin"]));
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
