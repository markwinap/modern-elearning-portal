import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, teacherProcedure } from "~/server/api/trpc";
import {
  activities,
  courses,
  courseSections,
  workshopAssessments,
  workshopRubrics,
  workshopSubmissions,
  workshops,
} from "~/server/db/schema";

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
        phase: z.enum(["setup", "submission", "assessment", "grading", "closed"]).default("setup"),
        submissionDeadline: z.date().optional(),
        assessmentDeadline: z.date().optional(),
        maxSubmissions: z.number().int().default(1),
        peerAssessmentsRequired: z.number().int().default(3),
        teacherWeighting: z.number().min(0).max(100).default(50),
        peerWeighting: z.number().min(0).max(100).default(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
      const [rubric] = await ctx.db.insert(workshopRubrics).values(input).returning();
      return rubric;
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
      const role = ctx.session.user.role as string | undefined;
      if (role === "teacher" || role === "admin") {
        return ctx.db
          .select()
          .from(workshopSubmissions)
          .where(eq(workshopSubmissions.workshopActivityId, input.workshopActivityId));
      }
      return ctx.db
        .select()
        .from(workshopSubmissions)
        .where(
          and(
            eq(workshopSubmissions.workshopActivityId, input.workshopActivityId),
            eq(workshopSubmissions.userId, ctx.session.user.id),
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
