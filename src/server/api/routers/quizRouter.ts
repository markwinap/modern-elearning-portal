import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { z } from "zod";

import { calculatePercentage, percentageToLetter } from "~/lib/grade-utils";
import { seededShuffle } from "~/lib/quiz-utils";
import {
  calculateAverage,
  calculateDifficultyIndex,
  calculateDiscriminationIndex,
  calculateMedian,
  calculatePercentile,
  formatDurationSecs,
  sumRecommendedDurationMins,
} from "~/lib/insight-utils";
import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  activities,
  courses,
  courseSections,
  grades,
  quizAnswers,
  quizAttempts,
  quizQuestions,
  quizzes,
} from "~/server/db/schema";

export const quizRouter = createTRPCRouter({
  /** Get quiz config for an activity. */
  getQuiz: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [quiz] = await ctx.db
        .select()
        .from(quizzes)
        .where(eq(quizzes.activityId, input.activityId))
        .limit(1);
      return quiz ?? null;
    }),

  /** Upsert quiz settings (teacher). */
  upsertQuiz: teacherProcedure
    .input(
      z.object({
        activityId: z.number().int(),
        timeLimitSecs: z.number().int().optional(),
        maxAttempts: z.number().int().optional(),
        questionsPerAttempt: z.number().int().min(0).optional(),
        oneQuestionAtATime: z.boolean().default(false),
        shuffleQuestions: z.boolean().default(false),
        shuffleAnswers: z.boolean().default(false),
        showFeedback: z.boolean().optional(),
        feedbackMode: z
          .enum(["immediate", "after_last_attempt", "after_due_date", "never"])
          .default("immediate"),
        availableUntil: z
          .union([z.string().datetime(), z.date(), z.null()])
          .optional()
          .transform((v) =>
            v ? (typeof v === "string" ? new Date(v) : v) : null,
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const effectiveQuestionsPerAttempt =
        input.questionsPerAttempt && input.questionsPerAttempt > 0
          ? input.questionsPerAttempt
          : null;
      const effectiveShowFeedback =
        input.showFeedback ?? input.feedbackMode === "immediate";

      const [quiz] = await ctx.db
        .insert(quizzes)
        .values({
          ...input,
          questionsPerAttempt: effectiveQuestionsPerAttempt,
          showFeedback: effectiveShowFeedback,
          availableUntil:
            input.availableUntil instanceof Date ? input.availableUntil : null,
        })
        .onConflictDoUpdate({
          target: [quizzes.activityId],
          set: {
            timeLimitSecs: input.timeLimitSecs,
            maxAttempts: input.maxAttempts,
            questionsPerAttempt: effectiveQuestionsPerAttempt,
            oneQuestionAtATime: input.oneQuestionAtATime,
            shuffleQuestions: input.shuffleQuestions,
            shuffleAnswers: input.shuffleAnswers,
            showFeedback: effectiveShowFeedback,
            feedbackMode: input.feedbackMode,
            availableUntil:
              input.availableUntil instanceof Date
                ? input.availableUntil
                : null,
          },
        })
        .returning();
      return quiz;
    }),

  /** List questions for a quiz. */
  listQuestions: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizActivityId, input.activityId))
        .orderBy(asc(quizQuestions.order));
    }),

  /** Create a question (teacher). */
  createQuestion: teacherProcedure
    .input(
      z.object({
        quizActivityId: z.number().int(),
        type: z.enum([
          "multiple_choice",
          "true_false",
          "short_answer",
          "fill_blank",
          "matching",
          "ordering",
          "essay",
        ]),
        prompt: z.string().min(1),
        options: z.array(z.unknown()).optional(),
        correctAnswer: z.unknown().optional(),
        allowMultiple: z.boolean().default(false),
        points: z.number().int().default(1),
        order: z.number().int().default(0),
        recommendedTimeMins: z.number().int().min(0).default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [q] = await ctx.db.insert(quizQuestions).values(input).returning();
      return q;
    }),

  /** Start an attempt. */
  startAttempt: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [quizConfig] = await ctx.db
        .select({
          maxAttempts: quizzes.maxAttempts,
          questionsPerAttempt: quizzes.questionsPerAttempt,
          shuffleQuestions: quizzes.shuffleQuestions,
        })
        .from(quizzes)
        .where(eq(quizzes.activityId, input.activityId))
        .limit(1);

      const maxAttempts = quizConfig?.maxAttempts ?? null;

      if (maxAttempts !== null && maxAttempts !== 0) {
        // Return an existing in-progress attempt so the user can finish it
        // without consuming another attempt.
        const [inProgress] = await ctx.db
          .select()
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.quizActivityId, input.activityId),
              eq(quizAttempts.userId, ctx.session.user.id),
              isNull(quizAttempts.submittedAt),
            ),
          )
          .limit(1);
        if (inProgress) return inProgress;

        // Count submitted attempts and enforce the limit.
        const [submittedCount] = await ctx.db
          .select({ count: count() })
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.quizActivityId, input.activityId),
              eq(quizAttempts.userId, ctx.session.user.id),
              isNotNull(quizAttempts.submittedAt),
            ),
          );

        if (Number(submittedCount?.count ?? 0) >= maxAttempts) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Maximum attempts reached for this quiz.",
          });
        }
      }

      // Build the question subset for this attempt.
      const allQuestions = await ctx.db
        .select({ id: quizQuestions.id, order: quizQuestions.order })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizActivityId, input.activityId))
        .orderBy(asc(quizQuestions.order));

      const perAttempt = quizConfig?.questionsPerAttempt ?? null;
      const total = allQuestions.length;
      let selectedQuestionIds: number[] | null = null;

      if (perAttempt && perAttempt > 0 && perAttempt < total) {
        const seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        const shuffled = seededShuffle(allQuestions, seed);
        const picked = shuffled.slice(0, perAttempt).map((q) => q.id);

        if (quizConfig?.shuffleQuestions) {
          selectedQuestionIds = picked;
        } else {
          // Keep the teacher-defined order for the selected subset.
          const pickedSet = new Set(picked);
          selectedQuestionIds = allQuestions
            .filter((q) => pickedSet.has(q.id))
            .map((q) => q.id);
        }
      }

      const [attempt] = await ctx.db
        .insert(quizAttempts)
        .values({
          quizActivityId: input.activityId,
          userId: ctx.session.user.id,
          startedAt: new Date(),
          questionIds: selectedQuestionIds,
        })
        .returning();
      return attempt;
    }),

  /** Submit an attempt. */
  submitAttempt: protectedProcedure
    .input(
      z.object({
        attemptId: z.number().int(),
        answers: z.array(
          z.object({
            questionId: z.number().int(),
            answer: z.unknown(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [attempt] = await ctx.db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.id, input.attemptId),
            eq(quizAttempts.userId, ctx.session.user.id),
          ),
        )
        .limit(1);
      if (!attempt) throw new TRPCError({ code: "NOT_FOUND" });

      const [questions, [quizConfig]] = await Promise.all([
        ctx.db
          .select()
          .from(quizQuestions)
          .where(eq(quizQuestions.quizActivityId, attempt.quizActivityId)),
        ctx.db
          .select({
            showFeedback: quizzes.showFeedback,
            feedbackMode: quizzes.feedbackMode,
            availableUntil: quizzes.availableUntil,
            maxAttempts: quizzes.maxAttempts,
          })
          .from(quizzes)
          .where(eq(quizzes.activityId, attempt.quizActivityId))
          .limit(1),
      ]);

      const attemptQuestionIds = Array.isArray(attempt.questionIds)
        ? new Set<number>(attempt.questionIds)
        : null;
      const activeQuestions = attemptQuestionIds
        ? questions.filter((q) => attemptQuestionIds.has(q.id))
        : questions;

      const maxScore = activeQuestions.reduce((s, q) => s + q.points, 0);

      // Normalize boolean true/false to strings so "true" (string) matches true (boolean) in JSONB,
      // and sort arrays so multi-answer (checkbox) questions grade order-independently.
      const normalizeForGrading = (v: unknown): unknown => {
        if (typeof v === "boolean") return String(v);
        if (Array.isArray(v)) {
          return (v as unknown[])
            .map((item) => (typeof item === "boolean" ? String(item) : item))
            .sort((a, b) => String(a).localeCompare(String(b)));
        }
        return v;
      };

      // Grade answers sequentially to safely accumulate score
      let score = 0;
      const gradedAnswers = input.answers.flatMap(({ questionId, answer }) => {
        const question = activeQuestions.find((q) => q.id === questionId);
        if (!question) return [];
        const isCorrect =
          JSON.stringify(normalizeForGrading(answer)) ===
          JSON.stringify(normalizeForGrading(question.correctAnswer));
        if (isCorrect) score += question.points;
        return [
          {
            attemptId: input.attemptId,
            questionId,
            answer,
            isCorrect,
            pointsAwarded: isCorrect ? question.points : 0,
            correctAnswer: question.correctAnswer,
          },
        ];
      });

      if (gradedAnswers.length > 0) {
        await ctx.db
          .insert(quizAnswers)
          .values(gradedAnswers.map(({ correctAnswer: _ca, ...row }) => row));
      }

      await ctx.db
        .update(quizAttempts)
        .set({ submittedAt: new Date(), score, maxScore })
        .where(eq(quizAttempts.id, input.attemptId));

      const feedbackMode = quizConfig?.feedbackMode ?? "immediate";

      let showAnswerKey = false;
      if (feedbackMode === "never") {
        showAnswerKey = false;
      } else if (feedbackMode === "immediate") {
        showAnswerKey = quizConfig?.showFeedback ?? true;
      } else if (feedbackMode === "after_due_date") {
        showAnswerKey = quizConfig?.availableUntil
          ? new Date() > new Date(quizConfig.availableUntil)
          : false;
      } else if (feedbackMode === "after_last_attempt" && quizConfig) {
        const maxAttempts = quizConfig.maxAttempts;
        if (maxAttempts !== null && maxAttempts !== 0) {
          const [submittedCount] = await ctx.db
            .select({ count: count() })
            .from(quizAttempts)
            .where(
              and(
                eq(quizAttempts.quizActivityId, attempt.quizActivityId),
                eq(quizAttempts.userId, ctx.session.user.id),
                isNotNull(quizAttempts.submittedAt),
              ),
            );
          showAnswerKey = Number(submittedCount?.count ?? 0) >= maxAttempts;
        }
      }

      const feedback = showAnswerKey
        ? gradedAnswers.map(
            ({ questionId, isCorrect, pointsAwarded, correctAnswer }) => ({
              questionId,
              isCorrect,
              pointsAwarded,
              correctAnswer,
            }),
          )
        : null;

      // Auto-grade: create or update a gradebook entry for this quiz attempt.
      const [activity] = await ctx.db
        .select({
          gradable: activities.gradable,
          sectionGradable: courseSections.gradable,
          gradeCategoryId: activities.gradeCategoryId,
        })
        .from(activities)
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .where(eq(activities.id, attempt.quizActivityId))
        .limit(1);

      if (activity?.gradable && activity.sectionGradable) {
        const [existingGrade] = await ctx.db
          .select({ isAutoGraded: grades.isAutoGraded })
          .from(grades)
          .where(
            and(
              eq(grades.activityId, attempt.quizActivityId),
              eq(grades.userId, attempt.userId),
            ),
          )
          .limit(1);

        if (!existingGrade || existingGrade.isAutoGraded) {
          const percentage = calculatePercentage(score, maxScore);
          const letterGrade = percentageToLetter(percentage);
          await ctx.db
            .insert(grades)
            .values({
              activityId: attempt.quizActivityId,
              userId: attempt.userId,
              gradeCategoryId: activity.gradeCategoryId ?? null,
              rawScore: score,
              maxScore,
              percentage,
              letterGrade,
              feedback: null,
              isAutoGraded: true,
              gradedAt: new Date(),
              gradedById: null,
            })
            .onConflictDoUpdate({
              target: [grades.activityId, grades.userId],
              set: {
                gradeCategoryId: activity.gradeCategoryId ?? null,
                rawScore: score,
                maxScore,
                percentage,
                letterGrade,
                feedback: null,
                isAutoGraded: true,
                gradedAt: new Date(),
                gradedById: null,
              },
            });
        }
      }

      return { score, maxScore, feedback };
    }),

  /** Get my attempts for a quiz. */
  getMyAttempts: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.quizActivityId, input.activityId),
            eq(quizAttempts.userId, ctx.session.user.id),
          ),
        );
    }),

  /** Update a question (teacher). */
  updateQuestion: teacherProcedure
    .input(
      z.object({
        id: z.number().int(),
        type: z.enum([
          "multiple_choice",
          "true_false",
          "short_answer",
          "fill_blank",
          "matching",
          "ordering",
          "essay",
        ]),
        prompt: z.string().min(1),
        options: z.array(z.unknown()).optional(),
        correctAnswer: z.unknown().optional(),
        allowMultiple: z.boolean().default(false),
        points: z.number().int().min(1),
        recommendedTimeMins: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ courseId: courses.id, teacherId: courses.teacherId })
        .from(quizQuestions)
        .innerJoin(activities, eq(quizQuestions.quizActivityId, activities.id))
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .where(eq(quizQuestions.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, row.teacherId);
      const [updated] = await ctx.db
        .update(quizQuestions)
        .set({
          type: input.type,
          prompt: input.prompt,
          options: input.options ?? null,
          correctAnswer: input.correctAnswer ?? null,
          allowMultiple: input.allowMultiple,
          points: input.points,
          recommendedTimeMins: input.recommendedTimeMins,
        })
        .where(eq(quizQuestions.id, input.id))
        .returning();
      return updated;
    }),

  /** Recommended duration for a quiz based on per-question recommended times. */
  getRecommendedDuration: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const questions = await ctx.db
        .select({ recommendedTimeMins: quizQuestions.recommendedTimeMins })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizActivityId, input.activityId));
      return {
        recommendedMins: sumRecommendedDurationMins(questions),
      };
    }),

  /** Question-level insights for a quiz. */
  getQuestionInsights: teacherProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(activities)
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .where(eq(activities.id, input.activityId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);

      const questions = await ctx.db
        .select()
        .from(quizQuestions)
        .where(eq(quizQuestions.quizActivityId, input.activityId))
        .orderBy(asc(quizQuestions.order));

      const attempts = await ctx.db
        .select({
          id: quizAttempts.id,
          score: quizAttempts.score,
          maxScore: quizAttempts.maxScore,
        })
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.quizActivityId, input.activityId),
            isNotNull(quizAttempts.submittedAt),
          ),
        );

      const answers =
        attempts.length > 0
          ? await ctx.db
              .select()
              .from(quizAnswers)
              .where(
                inArray(
                  quizAnswers.attemptId,
                  attempts.map((a) => a.id),
                ),
              )
          : [];

      const attemptsByScorePct = new Map(
        attempts.map((a) => [
          a.id,
          a.maxScore && a.maxScore > 0 ? (a.score ?? 0) / a.maxScore : 0,
        ]),
      );

      return questions.map((q) => {
        const questionAnswers = answers.filter((a) => a.questionId === q.id);
        const times = questionAnswers.map((a) => a.timeSpentSecs);
        const scores = questionAnswers.map((a) =>
          q.points > 0 ? (a.pointsAwarded / q.points) * 100 : 0,
        );
        const correctCount = questionAnswers.filter((a) => a.isCorrect).length;

        return {
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          points: q.points,
          attempts: questionAnswers.length,
          averageScore: calculateAverage(scores),
          medianScore: calculateMedian(scores),
          averageTimeSecs: calculateAverage(times),
          medianTimeSecs: calculateMedian(times),
          difficulty: calculateDifficultyIndex(
            questionAnswers.length,
            correctCount,
          ),
          discrimination: calculateDiscriminationIndex(
            questionAnswers.map((a) => ({
              isCorrect: a.isCorrect,
              totalScorePct: attemptsByScorePct.get(a.attemptId) ?? 0,
            })),
          ),
        };
      });
    }),

  /** Test-level insights for a quiz. */
  getTestInsights: teacherProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(activities)
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .where(eq(activities.id, input.activityId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);

      const [questionCount] = await ctx.db
        .select({ count: count() })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizActivityId, input.activityId));

      const attempts = await ctx.db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.quizActivityId, input.activityId),
            isNotNull(quizAttempts.submittedAt),
          ),
        );

      const scores = attempts.map((a) =>
        a.maxScore && a.maxScore > 0 ? (a.score ?? 0) / a.maxScore : 0,
      );
      const durations = attempts
        .map((a) =>
          a.submittedAt && a.startedAt
            ? Math.round(
                (a.submittedAt.getTime() - a.startedAt.getTime()) / 1000,
              )
            : 0,
        )
        .filter((d) => d > 0);

      return {
        questionCount: questionCount?.count ?? 0,
        attempts: attempts.length,
        averageScore: calculateAverage(scores) * 100,
        medianScore: calculateMedian(scores) * 100,
        p75Score: calculatePercentile(scores, 75) * 100,
        p90Score: calculatePercentile(scores, 90) * 100,
        averageTime: formatDurationSecs(calculateAverage(durations)),
        medianTime: formatDurationSecs(calculateMedian(durations)),
        scoreDistribution: [0, 20, 40, 60, 80].map((bucket) => ({
          bucket,
          count: attempts.filter((a) => {
            const pct =
              a.maxScore && a.maxScore > 0 ? (a.score ?? 0) / a.maxScore : 0;
            const lower = bucket / 100;
            const upper = (bucket + 20) / 100;
            return pct >= lower && (bucket === 80 ? pct <= upper : pct < upper);
          }).length,
        })),
      };
    }),

  /** Delete a question (teacher). */
  deleteQuestion: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ courseId: courses.id, teacherId: courses.teacherId })
        .from(quizQuestions)
        .innerJoin(activities, eq(quizQuestions.quizActivityId, activities.id))
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .where(eq(quizQuestions.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, row.teacherId);
      await ctx.db.delete(quizQuestions).where(eq(quizQuestions.id, input.id));
    }),
});
