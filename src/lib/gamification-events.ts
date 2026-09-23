import { z } from "zod";

export const activityCompletedEventSchema = z.object({
  type: z.literal("activity_completed"),
  activityId: z.number().int(),
  courseId: z.number().int(),
});

export const quizPassedEventSchema = z.object({
  type: z.literal("quiz_passed"),
  activityId: z.number().int(),
  courseId: z.number().int(),
  attemptId: z.number().int(),
  score: z.number().int(),
  maxScore: z.number().int(),
});

export const courseCompletedEventSchema = z.object({
  type: z.literal("course_completed"),
  courseId: z.number().int(),
});

export const dailyLoginEventSchema = z.object({
  type: z.literal("daily_login"),
  date: z.string().date(),
});

export const gamificationEventSchema = z.discriminatedUnion("type", [
  activityCompletedEventSchema,
  quizPassedEventSchema,
  courseCompletedEventSchema,
  dailyLoginEventSchema,
]);

export type GamificationEvent = z.infer<typeof gamificationEventSchema>;
