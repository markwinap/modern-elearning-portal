import { describe, expect, it } from "vitest";

import {
  calculateAverage,
  calculateDifficultyIndex,
  calculateDiscriminationIndex,
  calculateMedian,
  calculatePercentile,
  formatDurationMins,
  formatDurationSecs,
  sumRecommendedDurationMins,
} from "~/lib/insight-utils";

describe("sumRecommendedDurationMins", () => {
  it("sums recommended times from multiple questions", () => {
    const questions = [
      { recommendedTimeMins: 2 },
      { recommendedTimeMins: 3 },
      { recommendedTimeMins: 5 },
    ];
    expect(sumRecommendedDurationMins(questions)).toBe(10);
  });

  it("returns 0 for empty array", () => {
    expect(sumRecommendedDurationMins([])).toBe(0);
  });
});

describe("calculateAverage", () => {
  it("calculates average of numbers", () => {
    expect(calculateAverage([10, 20, 30])).toBe(20);
  });

  it("returns 0 for empty array", () => {
    expect(calculateAverage([])).toBe(0);
  });
});

describe("calculateMedian", () => {
  it("calculates median for odd-length arrays", () => {
    expect(calculateMedian([1, 3, 5])).toBe(3);
  });

  it("calculates median for even-length arrays", () => {
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it("returns 0 for empty array", () => {
    expect(calculateMedian([])).toBe(0);
  });
});

describe("calculatePercentile", () => {
  it("calculates 75th percentile", () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(calculatePercentile(values, 75)).toBe(80);
  });

  it("returns 0 for empty array", () => {
    expect(calculatePercentile([], 50)).toBe(0);
  });
});

describe("calculateDifficultyIndex", () => {
  it("returns fraction of correct responses", () => {
    expect(calculateDifficultyIndex(10, 7)).toBeCloseTo(0.7);
  });

  it("returns 0 when no attempts", () => {
    expect(calculateDifficultyIndex(0, 0)).toBe(0);
  });

  it("returns 1 when all correct", () => {
    expect(calculateDifficultyIndex(5, 5)).toBe(1);
  });
});

describe("calculateDiscriminationIndex", () => {
  it("returns positive discrimination when high performers do better", () => {
    const answers = [
      { isCorrect: true, totalScorePct: 0.9 },
      { isCorrect: true, totalScorePct: 0.85 },
      { isCorrect: true, totalScorePct: 0.8 },
      { isCorrect: false, totalScorePct: 0.3 },
      { isCorrect: false, totalScorePct: 0.2 },
      { isCorrect: false, totalScorePct: 0.1 },
    ];
    const result = calculateDiscriminationIndex(answers);
    expect(result).toBeGreaterThan(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateDiscriminationIndex([])).toBe(0);
  });

  it("returns negative discrimination when low performers do better", () => {
    const answers = [
      { isCorrect: false, totalScorePct: 0.9 },
      { isCorrect: false, totalScorePct: 0.85 },
      { isCorrect: false, totalScorePct: 0.8 },
      { isCorrect: true, totalScorePct: 0.3 },
      { isCorrect: true, totalScorePct: 0.2 },
      { isCorrect: true, totalScorePct: 0.1 },
    ];
    const result = calculateDiscriminationIndex(answers);
    expect(result).toBeLessThan(0);
  });
});

describe("formatDurationMins", () => {
  it("formats zero as '0 min'", () => {
    expect(formatDurationMins(0)).toBe("0 min");
  });

  it("formats minutes less than 60", () => {
    expect(formatDurationMins(45)).toBe("45 mins");
  });

  it("formats singular minute", () => {
    expect(formatDurationMins(1)).toBe("1 min");
  });

  it("formats hours only", () => {
    expect(formatDurationMins(120)).toBe("2 hrs");
  });

  it("formats hours and minutes", () => {
    expect(formatDurationMins(90)).toBe("1 hr 30 mins");
  });
});

describe("formatDurationSecs", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDurationSecs(125)).toBe("2:05");
  });

  it("formats zero", () => {
    expect(formatDurationSecs(0)).toBe("0:00");
  });
});
