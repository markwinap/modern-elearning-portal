import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  calculatePercentage,
  computeFinalGrade,
  percentageToLetter,
} from "~/lib/grade-utils";
import { type db } from "~/server/db";
import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { createNotification } from "~/server/lib/notifications";
import {
  activities,
  courses,
  courseSections,
  enrollments,
  gradeCategories,
  grades,
  user,
} from "~/server/db/schema";

type DB = typeof db;

/** IDs of gradable activities within a course (gradable section + gradable activity). */
async function getGradableActivityIds(database: DB, courseId: number) {
  const rows = await database
    .select({ id: activities.id })
    .from(activities)
    .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
    .where(
      and(
        eq(courseSections.courseId, courseId),
        eq(courseSections.gradable, true),
        eq(activities.gradable, true),
      ),
    );
  return rows.map((a) => a.id);
}

/** Columns shared by getMyGrades/getCourseGrades — extended per-query with viewer-specific fields. */
const baseGradeRowFields = {
  id: grades.id,
  activityId: grades.activityId,
  userId: grades.userId,
  gradeCategoryId: grades.gradeCategoryId,
  rawScore: grades.rawScore,
  maxScore: grades.maxScore,
  percentage: grades.percentage,
  letterGrade: grades.letterGrade,
  feedback: grades.feedback,
  isAutoGraded: grades.isAutoGraded,
  gradedAt: grades.gradedAt,
  gradedById: grades.gradedById,
  activityTitle: activities.title,
  activityType: activities.type,
  sectionTitle: courseSections.title,
  gradeCategoryName: gradeCategories.name,
};

/** Flattens a {grade, activity, section, category} join row into the shared grade summary shape. */
function mapGradeSummaryRow(g: {
  grade: typeof grades.$inferSelect;
  activity: typeof activities.$inferSelect;
  section: typeof courseSections.$inferSelect;
  category: typeof gradeCategories.$inferSelect | null;
}) {
  return {
    id: g.grade.id,
    activityId: g.grade.activityId,
    gradeCategoryId: g.grade.gradeCategoryId,
    rawScore: g.grade.rawScore,
    maxScore: g.grade.maxScore,
    percentage: g.grade.percentage,
    letterGrade: g.grade.letterGrade,
    feedback: g.grade.feedback,
    isAutoGraded: g.grade.isAutoGraded,
    gradedAt: g.grade.gradedAt,
    gradedById: g.grade.gradedById,
    activityTitle: g.activity.title,
    activityType: g.activity.type,
    sectionTitle: g.section.title,
    gradeCategoryName: g.category?.name ?? null,
  };
}

export const gradebookRouter = createTRPCRouter({
  /** Get all grades for a student in a course. */
  getMyGrades: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const activityIds = await getGradableActivityIds(ctx.db, input.courseId);
      if (activityIds.length === 0) return [];

      return ctx.db
        .select(baseGradeRowFields)
        .from(grades)
        .innerJoin(activities, eq(grades.activityId, activities.id))
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .leftJoin(
          gradeCategories,
          eq(grades.gradeCategoryId, gradeCategories.id),
        )
        .where(
          and(
            eq(grades.userId, ctx.session.user.id),
            inArray(grades.activityId, activityIds),
          ),
        )
        .orderBy(desc(grades.gradedAt));
    }),

  /** Get grades for all students in a course (teacher view). */
  getCourseGrades: teacherProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
      const activityIds = await getGradableActivityIds(ctx.db, input.courseId);
      if (activityIds.length === 0) return [];

      return ctx.db
        .select({
          ...baseGradeRowFields,
          userName: user.name,
          userEmail: user.email,
        })
        .from(grades)
        .innerJoin(activities, eq(grades.activityId, activities.id))
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(user, eq(grades.userId, user.id))
        .leftJoin(
          gradeCategories,
          eq(grades.gradeCategoryId, gradeCategories.id),
        )
        .where(inArray(grades.activityId, activityIds))
        .orderBy(desc(grades.gradedAt));
    }),

  /** Submit a grade (teacher). */
  submitGrade: teacherProcedure
    .input(
      z.object({
        activityId: z.number().int(),
        userId: z.string(),
        rawScore: z.number().min(0),
        maxScore: z.number().min(0),
        feedback: z.string().optional(),
        gradeCategoryId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [activity] = await ctx.db
        .select({
          activityId: activities.id,
          courseId: courses.id,
          courseTitle: courses.title,
          courseSlug: courses.slug,
          sectionGradable: courseSections.gradable,
          activityGradable: activities.gradable,
          activityGradeCategoryId: activities.gradeCategoryId,
          teacherId: courses.teacherId,
        })
        .from(activities)
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .where(eq(activities.id, input.activityId))
        .limit(1);
      if (!activity) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Activity not found",
        });
      }

      assertOwnerOrAdmin(ctx, activity.teacherId);

      if (!activity.sectionGradable || !activity.activityGradable) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This activity is not gradable",
        });
      }

      let gradeCategoryId = input.gradeCategoryId;
      if (gradeCategoryId === undefined) {
        gradeCategoryId = activity.activityGradeCategoryId ?? null;
      }

      if (gradeCategoryId !== null) {
        const [category] = await ctx.db
          .select({ id: gradeCategories.id })
          .from(gradeCategories)
          .where(
            and(
              eq(gradeCategories.id, gradeCategoryId),
              eq(gradeCategories.courseId, activity.courseId),
            ),
          )
          .limit(1);
        if (!category) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Grade category not found for this course",
          });
        }
      }

      const percentage = calculatePercentage(input.rawScore, input.maxScore);
      const letterGrade = percentageToLetter(percentage);

      const [grade] = await ctx.db
        .insert(grades)
        .values({
          activityId: input.activityId,
          userId: input.userId,
          gradeCategoryId,
          rawScore: input.rawScore,
          maxScore: input.maxScore,
          percentage,
          letterGrade,
          feedback: input.feedback,
          gradedAt: new Date(),
          gradedById: ctx.session.user.id,
          isAutoGraded: false,
        })
        .onConflictDoUpdate({
          target: [grades.activityId, grades.userId],
          set: {
            gradeCategoryId,
            rawScore: input.rawScore,
            maxScore: input.maxScore,
            percentage,
            letterGrade,
            feedback: input.feedback,
            gradedAt: new Date(),
            gradedById: ctx.session.user.id,
            isAutoGraded: false,
          },
        })
        .returning();
      if (!grade) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      if (input.userId !== ctx.session.user.id) {
        await createNotification({
          userId: input.userId,
          type: "grade_posted",
          payload: {
            gradeId: grade.id,
            activityId: input.activityId,
            courseId: activity.courseId,
            courseSlug: activity.courseSlug,
            courseTitle: activity.courseTitle,
            rawScore: input.rawScore,
            maxScore: input.maxScore,
            percentage,
            letterGrade,
          },
        });
      }

      return grade;
    }),

  /** Get a student's grade summary across all enrolled courses. */
  getMyGradeSummary: protectedProcedure.query(async ({ ctx }) => {
    const activeEnrollments = await ctx.db
      .select({
        courseId: courses.id,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        courseCoverImageUrl: courses.coverImageUrl,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(
        and(
          eq(enrollments.userId, ctx.session.user.id),
          eq(enrollments.status, "active"),
        ),
      );

    if (activeEnrollments.length === 0) {
      return { courses: [] };
    }

    const courseIds = activeEnrollments.map((e) => e.courseId);

    const [categoryRows, gradeRows] = await Promise.all([
      ctx.db
        .select()
        .from(gradeCategories)
        .where(inArray(gradeCategories.courseId, courseIds)),
      ctx.db
        .select({
          grade: grades,
          activity: activities,
          section: courseSections,
          category: gradeCategories,
          course: courses,
        })
        .from(grades)
        .innerJoin(activities, eq(grades.activityId, activities.id))
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .leftJoin(
          gradeCategories,
          eq(grades.gradeCategoryId, gradeCategories.id),
        )
        .where(
          and(
            eq(grades.userId, ctx.session.user.id),
            eq(courseSections.gradable, true),
            eq(activities.gradable, true),
          ),
        )
        .orderBy(desc(grades.gradedAt)),
    ]);

    const categoriesByCourse = new Map<
      number,
      { id: number; name: string; weight: number }[]
    >();
    for (const cat of categoryRows) {
      const list = categoriesByCourse.get(cat.courseId);
      if (list) {
        list.push(cat);
      } else {
        categoriesByCourse.set(cat.courseId, [cat]);
      }
    }

    const gradesByCourse = new Map<number, typeof gradeRows>();
    for (const row of gradeRows) {
      const list = gradesByCourse.get(row.course.id);
      if (list) {
        list.push(row);
      } else {
        gradesByCourse.set(row.course.id, [row]);
      }
    }

    const courseReports = activeEnrollments.map((enrollment) => {
      const courseGrades = gradesByCourse.get(enrollment.courseId) ?? [];
      const courseCategories =
        categoriesByCourse.get(enrollment.courseId) ?? [];
      const { finalPercentage, letterGrade, breakdown } = computeFinalGrade(
        courseGrades.map((g) => ({
          percentage: g.grade.percentage,
          gradeCategoryId: g.grade.gradeCategoryId,
        })),
        courseCategories,
      );
      return {
        ...enrollment,
        finalPercentage,
        letterGrade,
        breakdown,
        grades: courseGrades.map(mapGradeSummaryRow),
      };
    });

    return { courses: courseReports };
  }),

  /** Get a course grade summary for all active students (teacher view). */
  getCourseGradeSummary: teacherProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);

      const [categoryRows, eligibleStudents, gradeRows, activityRows] =
        await Promise.all([
          ctx.db
            .select()
            .from(gradeCategories)
            .where(eq(gradeCategories.courseId, input.courseId)),
          ctx.db
            .select({
              userId: user.id,
              userName: user.name,
              userEmail: user.email,
              status: enrollments.status,
            })
            .from(enrollments)
            .innerJoin(user, eq(enrollments.userId, user.id))
            .where(
              and(
                eq(enrollments.courseId, input.courseId),
                eq(enrollments.role, "student"),
                inArray(enrollments.status, ["active", "completed"]),
              ),
            )
            .orderBy(asc(user.name)),
          ctx.db
            .select({
              grade: grades,
              activity: activities,
              section: courseSections,
              category: gradeCategories,
              student: user,
            })
            .from(grades)
            .innerJoin(activities, eq(grades.activityId, activities.id))
            .innerJoin(
              courseSections,
              eq(activities.sectionId, courseSections.id),
            )
            .innerJoin(user, eq(grades.userId, user.id))
            .leftJoin(
              gradeCategories,
              eq(grades.gradeCategoryId, gradeCategories.id),
            )
            .where(
              and(
                eq(courseSections.courseId, input.courseId),
                eq(courseSections.gradable, true),
                eq(activities.gradable, true),
              ),
            ),
          ctx.db
            .select({
              activity: activities,
              section: { id: courseSections.id, title: courseSections.title },
            })
            .from(activities)
            .innerJoin(
              courseSections,
              eq(activities.sectionId, courseSections.id),
            )
            .where(
              and(
                eq(courseSections.courseId, input.courseId),
                eq(courseSections.gradable, true),
                eq(activities.gradable, true),
              ),
            )
            .orderBy(asc(courseSections.order), asc(activities.order)),
        ]);

      const gradesByStudent = new Map<string, typeof gradeRows>();
      for (const row of gradeRows) {
        const list = gradesByStudent.get(row.student.id);
        if (list) {
          list.push(row);
        } else {
          gradesByStudent.set(row.student.id, [row]);
        }
      }

      const students = eligibleStudents.map((student) => {
        const studentGrades = gradesByStudent.get(student.userId) ?? [];
        const { finalPercentage, letterGrade, breakdown } = computeFinalGrade(
          studentGrades.map((g) => ({
            percentage: g.grade.percentage,
            gradeCategoryId: g.grade.gradeCategoryId,
          })),
          categoryRows,
        );
        return {
          ...student,
          finalPercentage,
          letterGrade,
          breakdown,
          grades: studentGrades.map(mapGradeSummaryRow),
        };
      });

      return {
        students,
        categories: categoryRows,
        activities: activityRows.map((row) => ({
          id: row.activity.id,
          title: row.activity.title,
          type: row.activity.type,
          sectionId: row.section.id,
          sectionTitle: row.section.title,
          gradeCategoryId: row.activity.gradeCategoryId,
        })),
      };
    }),

  /** List grade categories for a course. */
  listCategories: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(gradeCategories)
        .where(eq(gradeCategories.courseId, input.courseId))
        .orderBy(gradeCategories.order);
    }),

  /** Create a grade category (teacher). */
  createCategory: teacherProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        name: z.string().min(1).max(128),
        weight: z.number().min(0).max(100).optional(),
        order: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
      const existing = await ctx.db
        .select({ weight: gradeCategories.weight })
        .from(gradeCategories)
        .where(eq(gradeCategories.courseId, input.courseId));
      const totalWeight = existing.reduce((sum, c) => sum + c.weight, 0);
      const newWeight = input.weight ?? 100;
      if (totalWeight + newWeight > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Total category weight cannot exceed 100%. Remaining: ${100 - totalWeight}%`,
        });
      }
      const [cat] = await ctx.db
        .insert(gradeCategories)
        .values({
          courseId: input.courseId,
          name: input.name,
          weight: newWeight,
          order: input.order,
        })
        .returning();
      if (!cat) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return cat;
    }),

  /** Update a grade category (teacher). */
  updateCategory: teacherProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(128).optional(),
        weight: z.number().min(0).max(100).optional(),
        order: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [category] = await ctx.db
        .select({ courseId: gradeCategories.courseId })
        .from(gradeCategories)
        .where(eq(gradeCategories.id, input.id))
        .limit(1);
      if (!category) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, category.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
      if (input.weight !== undefined) {
        const siblingRows = await ctx.db
          .select({ id: gradeCategories.id, weight: gradeCategories.weight })
          .from(gradeCategories)
          .where(eq(gradeCategories.courseId, category.courseId));
        const totalWeight = siblingRows
          .filter((c) => c.id !== input.id)
          .reduce((sum, c) => sum + c.weight, 0);
        if (totalWeight + input.weight > 100) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Total category weight cannot exceed 100%. Remaining: ${100 - totalWeight}%`,
          });
        }
      }
      const { id, ...data } = input;
      const [cat] = await ctx.db
        .update(gradeCategories)
        .set(data)
        .where(eq(gradeCategories.id, id))
        .returning();
      if (!cat) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return cat;
    }),

  /** Delete a grade category (teacher). */
  deleteCategory: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [category] = await ctx.db
        .select({ courseId: gradeCategories.courseId })
        .from(gradeCategories)
        .where(eq(gradeCategories.id, input.id))
        .limit(1);
      if (!category) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, category.courseId))
        .limit(1);
      assertOwnerOrAdmin(ctx, course?.teacherId);
      await ctx.db
        .delete(gradeCategories)
        .where(eq(gradeCategories.id, input.id));
    }),
});
