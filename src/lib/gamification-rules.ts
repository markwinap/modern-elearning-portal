import { z } from "zod";

export const gamificationRulesSchema = z.object({
  activityCompletedPoints: z.number().int().min(0),
  quizPassedPoints: z.number().int().min(0),
  courseCompletedPoints: z.number().int().min(0),
  dailyLoginPoints: z.number().int().min(0),
  skillAttainedPoints: z.number().int().min(0).default(20),
  levelThresholds: z.array(z.number().int().min(0)).min(1),
});

export type GamificationRules = z.infer<typeof gamificationRulesSchema>;

export const DEFAULT_GAMIFICATION_RULES: GamificationRules = {
  activityCompletedPoints: 10,
  quizPassedPoints: 25,
  courseCompletedPoints: 100,
  dailyLoginPoints: 5,
  skillAttainedPoints: 20,
  levelThresholds: [0, 100, 250, 500, 1000, 2000],
};

export function calculateLevel(
  totalPoints: number,
  thresholds: number[],
): number {
  const sorted = [...thresholds].sort((a, b) => a - b);
  let level = 1;
  for (let i = 1; i < sorted.length; i++) {
    const threshold = sorted[i];
    if (threshold != null && totalPoints >= threshold) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}
