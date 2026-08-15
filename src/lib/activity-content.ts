import { z } from "zod";

// ─── Lesson (branching node graph) ───────────────────────────────────────────

export const lessonBranchSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(256),
  targetNodeId: z.string().min(1),
});

export const lessonNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(256),
  content: z.string(),
  branches: z.array(lessonBranchSchema).default([]),
});

export const lessonGraphSchema = z.object({
  startNodeId: z.string().min(1),
  nodes: z.array(lessonNodeSchema).min(1),
});

export type LessonBranch = z.infer<typeof lessonBranchSchema>;
export type LessonNode = z.infer<typeof lessonNodeSchema>;
export type LessonGraph = z.infer<typeof lessonGraphSchema>;

export const EMPTY_LESSON_GRAPH: LessonGraph = {
  startNodeId: "start",
  nodes: [
    {
      id: "start",
      title: "Start",
      content: "",
      branches: [],
    },
  ],
};

// ─── Wiki page form (mirrors wikiRouter.upsertPage) ───────────────────────────

export const wikiPageFormSchema = z.object({
  id: z.number().int().optional(),
  activityId: z.number().int(),
  title: z.string().min(1).max(256),
  content: z.string(),
});

export type WikiPageForm = z.infer<typeof wikiPageFormSchema>;

export const workshopPhases = [
  "setup",
  "submission",
  "assessment",
  "grading",
  "closed",
] as const;

export type WorkshopPhase = (typeof workshopPhases)[number];

// ─── Workshop rubric form ─────────────────────────────────────────────────────

export const workshopRubricFormSchema = z.object({
  id: z.number().int().optional(),
  workshopActivityId: z.number().int(),
  criterion: z.string().min(1).max(256),
  description: z.string().optional(),
  maxPoints: z.number().int().min(1),
  order: z.number().int().default(0),
});

export type WorkshopRubricForm = z.infer<typeof workshopRubricFormSchema>;

// ─── Workshop assessment form ─────────────────────────────────────────────────

export const workshopAssessmentFormSchema = z.object({
  submissionId: z.number().int(),
  scores: z.record(z.number().min(0)),
  feedback: z.string().optional(),
});

export type WorkshopAssessmentForm = z.infer<
  typeof workshopAssessmentFormSchema
>;
