import { z } from "zod";

export const QUIZ_QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank",
  "matching",
  "ordering",
  "essay",
] as const;

export type QuizQuestionType = (typeof QUIZ_QUESTION_TYPES)[number];

export const quizQuestionTypeSchema = z.enum(QUIZ_QUESTION_TYPES);

export interface MatchingOption {
  left: string;
  right: string;
}

/** Options stored on a quiz question. */
export type QuizQuestionOptions =
  | string[] // multiple_choice, ordering
  | MatchingOption[] // matching
  | undefined;

/** Correct answer stored on a quiz question. */
export type QuizCorrectAnswer =
  | string // multiple_choice single, true_false, short_answer, fill_blank
  | string[] // multiple_choice multi
  | Record<string, string> // matching
  | undefined;

/** Student answer submitted for a quiz question. */
export type QuizStudentAnswer =
  | string
  | string[]
  | Record<string, string>
  | boolean
  | undefined;

export interface ClientQuizQuestion {
  id: number;
  type: string;
  prompt: string;
  options: QuizQuestionOptions;
  allowMultiple: boolean;
  points: number;
  order: number;
}

export interface TeacherQuizQuestion extends ClientQuizQuestion {
  correctAnswer: QuizCorrectAnswer;
}

const stringArraySchema = z.array(z.string());
const matchingOptionsSchema = z.array(
  z.object({ left: z.string().min(1), right: z.string().min(1) }),
);

export const quizOptionsSchema: z.ZodType<QuizQuestionOptions> = z.union([
  stringArraySchema,
  matchingOptionsSchema,
  z.undefined(),
]);

export const quizCorrectAnswerSchema: z.ZodType<QuizCorrectAnswer> = z.union([
  z.string(),
  stringArraySchema,
  z.record(z.string()),
  z.undefined(),
]);

export const quizStudentAnswerSchema: z.ZodType<QuizStudentAnswer> = z.union([
  z.string(),
  stringArraySchema,
  z.record(z.string()),
  z.boolean(),
  z.undefined(),
]);

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function isMatchingOptions(value: unknown): value is MatchingOption[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        "left" in v &&
        typeof (v as Record<string, unknown>).left === "string" &&
        "right" in v &&
        typeof (v as Record<string, unknown>).right === "string",
    )
  );
}

export function isRecord(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([k, v]) => typeof k === "string" && typeof v === "string",
    )
  );
}

/**
 * Coerce legacy answers into a comparable value:
 * - booleans become "true" / "false" strings so JSON equality works
 * - arrays are sorted so checkbox/multi-select answers are order-independent
 */
function normalizeForGrading(
  value: QuizCorrectAnswer | QuizStudentAnswer,
): unknown {
  if (typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "boolean" ? String(item) : item))
      .sort((a, b) => String(a).localeCompare(String(b)));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
    );
  }
  return value;
}

export function gradeAnswer(
  correct: QuizCorrectAnswer,
  submitted: QuizStudentAnswer,
): boolean {
  if (correct === undefined || submitted === undefined) return false;
  return (
    JSON.stringify(normalizeForGrading(correct)) ===
    JSON.stringify(normalizeForGrading(submitted))
  );
}

/**
 * Type-guard helpers to validate an answer matches the question type at runtime.
 */
export function isValidAnswerForType(
  type: QuizQuestionType,
  answer: QuizStudentAnswer,
): boolean {
  switch (type) {
    case "multiple_choice":
      return typeof answer === "string" || isStringArray(answer);
    case "true_false":
      return (
        typeof answer === "string" && (answer === "true" || answer === "false")
      );
    case "short_answer":
    case "fill_blank":
      return typeof answer === "string";
    case "matching":
      return isRecord(answer);
    case "ordering":
      return isStringArray(answer);
    case "essay":
      return typeof answer === "string";
    default:
      return false;
  }
}

export function isValidOptionsForType(
  type: QuizQuestionType,
  options: QuizQuestionOptions,
): boolean {
  switch (type) {
    case "multiple_choice":
      return isStringArray(options) && options.length > 0;
    case "matching":
      return isMatchingOptions(options) && options.length > 0;
    case "ordering":
      return isStringArray(options) && options.length > 0;
    case "true_false":
    case "short_answer":
    case "fill_blank":
    case "essay":
      return options === undefined;
    default:
      return false;
  }
}

export function isValidCorrectAnswerForType(
  type: QuizQuestionType,
  correctAnswer: QuizCorrectAnswer,
  options: QuizQuestionOptions,
): boolean {
  switch (type) {
    case "multiple_choice": {
      if (correctAnswer === undefined) return false;
      if (!isStringArray(options)) return false;
      const answers =
        typeof correctAnswer === "string" ? [correctAnswer] : correctAnswer;
      return (
        isStringArray(answers) && answers.every((a) => options.includes(a))
      );
    }
    case "true_false":
      return correctAnswer === "true" || correctAnswer === "false";
    case "short_answer":
    case "fill_blank":
      return typeof correctAnswer === "string";
    case "matching":
      return isRecord(correctAnswer);
    case "ordering":
      return isStringArray(correctAnswer);
    case "essay":
      return correctAnswer === undefined;
    default:
      return false;
  }
}
