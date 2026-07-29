import { describe, expect, it } from "vitest";

import {
  calculatePercentage,
  computeFinalGrade,
  percentageToLetter,
} from "~/lib/grade-utils";

describe("percentageToLetter", () => {
  it("maps boundary percentages to the correct letter grade", () => {
    expect(percentageToLetter(97)).toBe("A+");
    expect(percentageToLetter(93)).toBe("A");
    expect(percentageToLetter(90)).toBe("A-");
    expect(percentageToLetter(87)).toBe("B+");
    expect(percentageToLetter(83)).toBe("B");
    expect(percentageToLetter(80)).toBe("B-");
    expect(percentageToLetter(77)).toBe("C+");
    expect(percentageToLetter(73)).toBe("C");
    expect(percentageToLetter(70)).toBe("C-");
    expect(percentageToLetter(67)).toBe("D+");
    expect(percentageToLetter(63)).toBe("D");
    expect(percentageToLetter(60)).toBe("D-");
  });

  it("returns F below the D- threshold", () => {
    expect(percentageToLetter(59)).toBe("F");
    expect(percentageToLetter(0)).toBe("F");
  });

  it("returns A+ for percentages above 100", () => {
    expect(percentageToLetter(105)).toBe("A+");
  });
});

describe("calculatePercentage", () => {
  it("rounds to the nearest whole percent", () => {
    expect(calculatePercentage(7, 10)).toBe(70);
    expect(calculatePercentage(1, 3)).toBe(33);
    expect(calculatePercentage(2, 3)).toBe(67);
  });

  it("returns 0 when maxScore is 0 or negative (avoids divide-by-zero)", () => {
    expect(calculatePercentage(5, 0)).toBe(0);
    expect(calculatePercentage(5, -10)).toBe(0);
  });

  it("returns 100 for a perfect score", () => {
    expect(calculatePercentage(10, 10)).toBe(100);
  });
});

describe("computeFinalGrade", () => {
  it("returns nulls and an empty breakdown when there are no graded entries", () => {
    const result = computeFinalGrade([], []);
    expect(result).toEqual({
      finalPercentage: null,
      letterGrade: null,
      breakdown: [],
    });
  });

  it("ignores ungraded (null percentage) entries", () => {
    const result = computeFinalGrade(
      [{ percentage: null, gradeCategoryId: null }],
      [],
    );
    expect(result.finalPercentage).toBeNull();
  });

  it("falls back to a simple average when there are no grade categories", () => {
    const result = computeFinalGrade(
      [
        { percentage: 80, gradeCategoryId: null },
        { percentage: 90, gradeCategoryId: null },
      ],
      [],
    );
    expect(result.finalPercentage).toBe(85);
    expect(result.letterGrade).toBe("B");
    expect(result.breakdown).toEqual([]);
  });

  it("computes a weighted average across categories", () => {
    const categories = [
      { id: 1, name: "Homework", weight: 40 },
      { id: 2, name: "Exams", weight: 60 },
    ];
    const grades = [
      { percentage: 100, gradeCategoryId: 1 }, // Homework avg = 100
      { percentage: 60, gradeCategoryId: 2 }, // Exams avg = 60
    ];
    // weighted = (100*40 + 60*60) / 100 = (4000 + 3600) / 100 = 76
    const result = computeFinalGrade(grades, categories);
    expect(result.finalPercentage).toBe(76);
    expect(result.letterGrade).toBe("C");
    expect(result.breakdown).toHaveLength(2);
    expect(result.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoryId: 1, average: 100, weight: 40 }),
        expect.objectContaining({ categoryId: 2, average: 60, weight: 60 }),
      ]),
    );
  });

  it("buckets grades with an unknown category id under 'Uncategorized'", () => {
    const categories = [{ id: 1, name: "Homework", weight: 100 }];
    const grades = [
      { percentage: 90, gradeCategoryId: 1 },
      { percentage: 50, gradeCategoryId: 999 }, // not in categories
    ];
    const result = computeFinalGrade(grades, categories);
    expect(result.breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ categoryId: null, name: "Uncategorized" }),
      ]),
    );
    // Only the categorized (weight=100) grade contributes to the weighted final.
    expect(result.finalPercentage).toBe(90);
  });

  it("falls back to a simple average when categories exist but none have grades", () => {
    const categories = [{ id: 1, name: "Homework", weight: 100 }];
    const grades = [{ percentage: 70, gradeCategoryId: 999 }];
    const result = computeFinalGrade(grades, categories);
    expect(result.finalPercentage).toBe(70);
    expect(result.breakdown).toEqual([
      expect.objectContaining({ categoryId: null, name: "Uncategorized" }),
    ]);
  });
});
