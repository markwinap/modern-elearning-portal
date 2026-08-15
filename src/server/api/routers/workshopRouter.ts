import { TRPCError } from "@trpc/server";
import { and, eq, not, notInArray } from "drizzle-orm";
import { z } from "zod";

import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { type db } from "~/server/db";
import {
  activities,
  courseSections,
  courses,
  workshopAssessments,
  workshopRubrics,
  workshopSubmissions,
  workshops,
} from "~/server/db/schema";

type DB = typeof db;

async function getCourseTeacherId(database: DB, activityId: number) {
  const [section] = await database
    .select({ courseId: courseSections.courseId })
    .from(activities)
    .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
    .where(eq(activities.id, activityId))
    .limit(1);
  if (!section) throw new TRPCError({ code: "NOT_FOUND" });
  const [course] = await database
    .select({ teacherId: courses.teacherId })
    .from(courses)
    .where(eq(courses.id, section.courseId))
    .limit(1);
  return course?.teacherId;
}

export const workshopRouter = createTRPCRouter({
  /** Get workshop settings. */
  getWorkshop: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [workshop] = await ctx.db
        .select()
        .from(workshops)
        .where(eq(workshops.activityId, input.activityId))
        .limit(1);
      return workshop ?? null;
    }),

  /** Upsert workshop settings (teacher). */
  upsertWorkshop: teacherProcedure
    .input(
      z.object({
        activityId: z.number().int(),
        phase: z
          .enum(["setup", "submission", "assessment", "grading", "closed"])
          .default("setup"),
        submissionDeadline: z.date().optional(),
        assessmentDeadline: z.date().optional(),
        maxSubmissions: z.number().int().default(1),
        peerAssessmentsRequired: z.number().int().default(3),
        teacherWeighting: z.number().min(0).max(100).default(50),
        peerWeighting: z.number().min(0).max(100).default(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const teacherId = await getCourseTeacherId(ctx.db, input.activityId);
      assertOwnerOrAdmin(ctx, teacherId);
      const [workshop] = await ctx.db
        .insert(workshops)
        .values(input)
        .onConflictDoUpdate({
          target: [workshops.activityId],
          set: {
            phase: input.phase,
            submissionDeadline: input.submissionDeadline,
            assessmentDeadline: input.assessmentDeadline,
            maxSubmissions: input.maxSubmissions,
            peerAssessmentsRequired: input.peerAssessmentsRequired,
            teacherWeighting: input.teacherWeighting,
            peerWeighting: input.peerWeighting,
          },
        })
        .returning();
      return workshop;
    }),

  /** List rubric criteria for a workshop. */
  listRubrics: protectedProcedure
    .input(z.object({ workshopActivityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(workshopRubrics)
        .where(eq(workshopRubrics.workshopActivityId, input.workshopActivityId))
        .orderBy(workshopRubrics.order);
    }),

  /** Add rubric criterion (teacher). */
  addRubric: teacherProcedure
    .input(
      z.object({
        workshopActivityId: z.number().int(),
        criterion: z.string().min(1),
        description: z.string().optional(),
        maxPoints: z.number().int(),
        order: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const teacherId = await getCourseTeacherId(
        ctx.db,
        input.workshopActivityId,
      );
      assertOwnerOrAdmin(ctx, teacherId);
      const [rubric] = await ctx.db
        .insert(workshopRubrics)
        .values(input)
        .returning();
      return rubric;
    }),

  /** Update a rubric criterion (teacher). */
  updateRubric: teacherProcedure
    .input(
      z.object({
        id: z.number().int(),
        criterion: z.string().min(1).optional(),
        description: z.string().optional(),
        maxPoints: z.number().int().optional(),
        order: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workshopActivityId: workshopRubrics.workshopActivityId })
        .from(workshopRubrics)
        .where(eq(workshopRubrics.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const teacherId = await getCourseTeacherId(
        ctx.db,
        existing.workshopActivityId,
      );
      assertOwnerOrAdmin(ctx, teacherId);
      const { id, ...data } = input;
      const [rubric] = await ctx.db
        .update(workshopRubrics)
        .set(data)
        .where(eq(workshopRubrics.id, id))
        .returning();
      return rubric;
    }),

  /** Delete a rubric criterion (teacher). */
  deleteRubric: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workshopActivityId: workshopRubrics.workshopActivityId })
        .from(workshopRubrics)
        .where(eq(workshopRubrics.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const teacherId = await getCourseTeacherId(
        ctx.db,
        existing.workshopActivityId,
      );
      assertOwnerOrAdmin(ctx, teacherId);
      await ctx.db
        .delete(workshopRubrics)
        .where(eq(workshopRubrics.id, input.id));
    }),

  /** Submit work (student). */
  submit: protectedProcedure
    .input(
      z.object({
        workshopActivityId: z.number().int(),
        content: z.string().min(1),
        attachmentKey: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [submission] = await ctx.db
        .insert(workshopSubmissions)
        .values({
          workshopActivityId: input.workshopActivityId,
          userId: ctx.session.user.id,
          content: input.content,
          attachmentKey: input.attachmentKey,
          submittedAt: new Date(),
        })
        .returning();
      return submission;
    }),

  /** List submissions for a workshop. */
  listSubmissions: protectedProcedure
    .input(z.object({ workshopActivityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const role = ctx.session.user.role;
      if (role === "teacher" || role === "admin") {
        return ctx.db
          .select()
          .from(workshopSubmissions)
          .where(
            eq(
              workshopSubmissions.workshopActivityId,
              input.workshopActivityId,
            ),
          );
      }
      return ctx.db
        .select()
        .from(workshopSubmissions)
        .where(
          and(
            eq(
              workshopSubmissions.workshopActivityId,
              input.workshopActivityId,
            ),
            eq(workshopSubmissions.userId, ctx.session.user.id),
          ),
        );
    }),

  /** List peer submissions available for assessment (student). */
  listPeerSubmissions: protectedProcedure
    .input(z.object({ workshopActivityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const alreadyAssessed = ctx.db
        .select({ submissionId: workshopAssessments.submissionId })
        .from(workshopAssessments)
        .where(eq(workshopAssessments.assessorId, ctx.session.user.id));

      return ctx.db
        .select()
        .from(workshopSubmissions)
        .where(
          and(
            eq(
              workshopSubmissions.workshopActivityId,
              input.workshopActivityId,
            ),
            not(eq(workshopSubmissions.userId, ctx.session.user.id)),
            notInArray(workshopSubmissions.id, alreadyAssessed),
          ),
        );
    }),

  /** Submit an assessment (peer or teacher). */
  submitAssessment: protectedProcedure
    .input(
      z.object({
        submissionId: z.number().int(),
        scores: z.record(z.number()),
        feedback: z.string().optional(),
        totalScore: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [assessment] = await ctx.db
        .insert(workshopAssessments)
        .values({
          submissionId: input.submissionId,
          assessorId: ctx.session.user.id,
          scores: input.scores,
          feedback: input.feedback,
          totalScore: input.totalScore,
          submittedAt: new Date(),
        })
        .returning();
      return assessment;
    }),

  /** Get assessments for a submission. */
  getAssessments: protectedProcedure
    .input(z.object({ submissionId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(workshopAssessments)
        .where(eq(workshopAssessments.submissionId, input.submissionId));
    }),
});
