import { TRPCError } from "@trpc/server";
import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import {
  isValidCorrectAnswerForType,
  isValidOptionsForType,
  quizCorrectAnswerSchema,
  quizOptionsSchema,
  quizQuestionTypeSchema,
} from "~/lib/quiz";
import { drawRandomSubset } from "~/lib/question-bank";
import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  teacherProcedure,
} from "~/server/api/trpc";
import type { db } from "~/server/db";
import {
  activities,
  courses,
  courseSections,
  questionBankEntries,
  questionBankEntryTags,
  questionTags,
  quizQuestions,
} from "~/server/db/schema";

const difficultySchema = z.enum(["easy", "medium", "hard"]);
const questionInputSchema = z
  .object({
    type: quizQuestionTypeSchema,
    prompt: z.string().min(1),
    options: quizOptionsSchema.optional(),
    correctAnswer: quizCorrectAnswerSchema.optional(),
    allowMultiple: z.boolean().default(false),
    points: z.number().int().min(1).default(1),
    recommendedTimeMins: z.number().int().min(0).default(1),
    difficulty: difficultySchema.default("medium"),
    explanation: z.string().max(5000).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  })
  .superRefine((data, ctx) => {
    if (!isValidOptionsForType(data.type, data.options))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "Invalid options for question type",
      });
    if (
      !isValidCorrectAnswerForType(data.type, data.correctAnswer, data.options)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctAnswer"],
        message: "Invalid correct answer for question type",
      });
  });

async function syncTags(
  ctx: { db: typeof db },
  ownerId: string,
  questionId: number,
  names: string[],
) {
  await ctx.db
    .delete(questionBankEntryTags)
    .where(eq(questionBankEntryTags.questionId, questionId));
  for (const name of [
    ...new Set(names.map((tag) => tag.trim().toLowerCase())),
  ]) {
    const [tag] = await ctx.db
      .insert(questionTags)
      .values({ ownerId, name })
      .onConflictDoUpdate({
        target: [questionTags.ownerId, questionTags.name],
        set: { name },
      })
      .returning({ id: questionTags.id });
    if (tag)
      await ctx.db
        .insert(questionBankEntryTags)
        .values({ questionId, tagId: tag.id })
        .onConflictDoNothing();
  }
}

function parseCsv(content: string) {
  return content
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((line) => {
      const values = line.split(",").map((value) => value.trim());
      const prompt = values[0] ?? "";
      const answer = values[1] ?? "";
      const difficulty = values[2] ?? "medium";
      const tags = values[3] ?? "";
      return {
        type: "short_answer" as const,
        prompt,
        correctAnswer: answer,
        difficulty: difficultySchema.catch("medium").parse(difficulty),
        tags: tags.split("|").filter(Boolean),
        allowMultiple: false,
        points: 1,
        recommendedTimeMins: 1,
      };
    })
    .filter((row) => row.prompt);
}

function parseGift(content: string) {
  return content.split(/\r?\n/).flatMap((line) => {
    const match = /^(.*?)\{=(.*?)\}$/.exec(line.trim());
    return match?.[1] && match[2]
      ? [
          {
            type: "short_answer" as const,
            prompt: match[1].trim(),
            correctAnswer: match[2].trim(),
            difficulty: "medium" as const,
            tags: [],
            allowMultiple: false,
            points: 1,
            recommendedTimeMins: 1,
          },
        ]
      : [];
  });
}

export const questionBankRouter = createTRPCRouter({
  list: teacherProcedure
    .input(
      z.object({
        search: z.string().max(200).default(""),
        difficulty: difficultySchema.optional(),
        tag: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(questionBankEntries.ownerId, ctx.session.user.id)];
      if (input.search)
        conditions.push(ilike(questionBankEntries.prompt, `%${input.search}%`));
      if (input.difficulty)
        conditions.push(eq(questionBankEntries.difficulty, input.difficulty));
      const rows = await ctx.db
        .select()
        .from(questionBankEntries)
        .where(and(...conditions))
        .orderBy(asc(questionBankEntries.prompt));
      const links = rows.length
        ? await ctx.db
            .select({
              questionId: questionBankEntryTags.questionId,
              name: questionTags.name,
            })
            .from(questionBankEntryTags)
            .innerJoin(
              questionTags,
              eq(questionBankEntryTags.tagId, questionTags.id),
            )
            .where(
              inArray(
                questionBankEntryTags.questionId,
                rows.map((row) => row.id),
              ),
            )
        : [];
      return rows.map((row) => ({
        ...row,
        tags: links
          .filter((link) => link.questionId === row.id)
          .map((link) => link.name),
        correctRate: row.attemptCount
          ? Math.round((row.correctCount / row.attemptCount) * 100)
          : null,
      }));
    }),
  create: teacherProcedure
    .input(questionInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { tags, ...values } = input;
      const [question] = await ctx.db
        .insert(questionBankEntries)
        .values({ ...values, ownerId: ctx.session.user.id })
        .returning();
      if (!question) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await syncTags(ctx, ctx.session.user.id, question.id, tags);
      return question;
    }),
  update: teacherProcedure
    .input(questionInputSchema.and(z.object({ id: z.number().int() })))
    .mutation(async ({ ctx, input }) => {
      const { id, tags, ...values } = input;
      const [question] = await ctx.db
        .update(questionBankEntries)
        .set(values)
        .where(
          and(
            eq(questionBankEntries.id, id),
            eq(questionBankEntries.ownerId, ctx.session.user.id),
          ),
        )
        .returning();
      if (!question) throw new TRPCError({ code: "NOT_FOUND" });
      await syncTags(ctx, ctx.session.user.id, id, tags);
      return question;
    }),
  delete: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(questionBankEntries)
        .where(
          and(
            eq(questionBankEntries.id, input.id),
            eq(questionBankEntries.ownerId, ctx.session.user.id),
          ),
        )
        .returning({ id: questionBankEntries.id });
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
    }),
  import: teacherProcedure
    .input(
      z.object({
        format: z.enum(["csv", "gift", "qti-lite"]),
        content: z.string().min(1).max(1_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const parsed =
        input.format === "gift"
          ? parseGift(input.content)
          : parseCsv(input.content);
      for (const item of parsed) {
        const { tags, ...values } = item;
        const [question] = await ctx.db
          .insert(questionBankEntries)
          .values({ ...values, ownerId: ctx.session.user.id })
          .returning({ id: questionBankEntries.id });
        if (question)
          await syncTags(ctx, ctx.session.user.id, question.id, tags);
      }
      return { imported: parsed.length };
    }),
  export: teacherProcedure
    .input(
      z.object({
        format: z.enum(["csv", "gift"]),
        ids: z.array(z.number().int()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(questionBankEntries.ownerId, ctx.session.user.id)];
      if (input.ids?.length)
        conditions.push(inArray(questionBankEntries.id, input.ids));
      const rows = await ctx.db
        .select()
        .from(questionBankEntries)
        .where(and(...conditions));
      if (input.format === "gift")
        return rows
          .map(
            (row) =>
              `${row.prompt}{=${typeof row.correctAnswer === "string" ? row.correctAnswer : ""}}`,
          )
          .join("\n");
      return [
        "prompt,answer,difficulty,tags",
        ...rows.map(
          (row) =>
            `"${row.prompt.replaceAll('"', '""')}","${typeof row.correctAnswer === "string" ? row.correctAnswer.replaceAll('"', '""') : ""}",${row.difficulty},`,
        ),
      ].join("\n");
    }),
  addToQuiz: teacherProcedure
    .input(
      z.object({
        quizActivityId: z.number().int(),
        questionIds: z.array(z.number().int()).min(1),
        randomCount: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(activities)
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .innerJoin(courses, eq(courseSections.courseId, courses.id))
        .where(eq(activities.id, input.quizActivityId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);
      const bankRows = await ctx.db
        .select()
        .from(questionBankEntries)
        .where(
          and(
            eq(questionBankEntries.ownerId, ctx.session.user.id),
            inArray(questionBankEntries.id, input.questionIds),
          ),
        );
      const selected = input.randomCount
        ? drawRandomSubset(bankRows, input.randomCount)
        : bankRows;
      const [orderResult] = await ctx.db
        .select({
          nextOrder: sql<number>`coalesce(max(${quizQuestions.order}), -1) + 1`,
        })
        .from(quizQuestions)
        .where(eq(quizQuestions.quizActivityId, input.quizActivityId));
      if (selected.length)
        await ctx.db.insert(quizQuestions).values(
          selected.map((row, index) => ({
            quizActivityId: input.quizActivityId,
            bankQuestionId: row.id,
            type: row.type,
            prompt: row.prompt,
            options: row.options,
            correctAnswer: row.correctAnswer,
            allowMultiple: row.allowMultiple,
            points: row.points,
            recommendedTimeMins: row.recommendedTimeMins,
            order: Number(orderResult?.nextOrder ?? 0) + index,
          })),
        );
      await ctx.db
        .update(questionBankEntries)
        .set({ usageCount: sql`${questionBankEntries.usageCount} + 1` })
        .where(
          inArray(
            questionBankEntries.id,
            selected.map((row) => row.id),
          ),
        );
      return { added: selected.length };
    }),
});
