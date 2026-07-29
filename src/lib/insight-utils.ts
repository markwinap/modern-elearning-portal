/**
 * Pure helpers for quiz and course analytics.
 * Keep all calculations deterministic and free of side effects so they are easy to unit test.
 */

export function sumRecommendedDurationMins(
  questions: Array<{ recommendedTimeMins: number }>,
): number {
  return questions.reduce((sum, q) => sum + q.recommendedTimeMins, 0);
}

export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}

export function calculateDifficultyIndex(attempts: number, correctCount: number): number {
  if (attempts === 0) return 0;
  return correctCount / attempts;
}

/**
 * Simple discrimination index using the top/bottom 27% split.
 * Returns the difference between the proportion of high performers who got the
 * question correct and the proportion of low performers who got it correct.
 * Range is -1 to 1; values above 0.3 are generally considered good discriminators.
 */
export function calculateDiscriminationIndex(
  answers: Array<{ isCorrect: boolean | null; totalScorePct: number }>,
): number {
  if (answers.length === 0) return 0;
  const sorted = [...answers].sort((a, b) => a.totalScorePct - b.totalScorePct);
  const groupSize = Math.max(1, Math.floor(sorted.length * 0.27));
  const bottom = sorted.slice(0, groupSize);
  const top = sorted.slice(-groupSize);

  const topCorrect = top.filter((a) => a.isCorrect).length / top.length;
  const bottomCorrect = bottom.filter((a) => a.isCorrect).length / bottom.length;
  return topCorrect - bottomCorrect;
}

export function formatDurationMins(mins: number): string {
  if (mins <= 0) return "0 min";
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (hours === 0) return `${mins} min${mins === 1 ? "" : "s"}`;
  if (remaining === 0) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hr ${remaining} min${remaining === 1 ? "" : "s"}`;
}

export function formatDurationSecs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
