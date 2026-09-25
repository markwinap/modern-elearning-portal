import { describe, expect, it } from "vitest";

import { drawRandomSubset } from "~/lib/question-bank";
import { evaluateReleaseRules } from "~/server/lib/drip";

const baseContext = {
  now: new Date("2026-01-10T00:00:00Z"),
  enrolledAt: new Date("2026-01-01T00:00:00Z"),
  completedActivityIds: new Set<number>(),
  activityScores: new Map<number, number>(),
};

describe("drip release evaluation", () => {
  it("locks future date and enrollment-offset content with criteria", () => {
    expect(
      evaluateReleaseRules(
        [{ type: "date", releaseAt: new Date("2026-02-01T00:00:00Z") }],
        baseContext,
      ).released,
    ).toBe(false);
    expect(
      evaluateReleaseRules(
        [{ type: "enrollment_offset", offsetDays: 14 }],
        baseContext,
      ).released,
    ).toBe(false);
  });

  it("supports completion, score, and manual prerequisites", () => {
    const context = {
      ...baseContext,
      completedActivityIds: new Set([5]),
      activityScores: new Map([[5, 85]]),
    };
    expect(
      evaluateReleaseRules(
        [
          { type: "activity_completion", prerequisiteActivityId: 5 },
          {
            type: "prerequisite_score",
            prerequisiteActivityId: 5,
            minimumScore: 80,
          },
          { type: "manual", manuallyReleased: true },
        ],
        context,
      ),
    ).toEqual({ released: true, reason: null });
    expect(
      evaluateReleaseRules(
        [
          {
            type: "prerequisite_score",
            prerequisiteActivityId: 5,
            minimumScore: 90,
          },
        ],
        context,
      ).released,
    ).toBe(false);
  });
});

describe("question bank random draws", () => {
  it("draws a unique bounded subset without mutating the bank", () => {
    const bank = [1, 2, 3, 4, 5];
    const drawn = drawRandomSubset(bank, 3, () => 0.25);
    expect(drawn).toHaveLength(3);
    expect(new Set(drawn)).toHaveLength(3);
    expect(bank).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles empty and oversized draws", () => {
    expect(drawRandomSubset([1, 2], 0)).toEqual([]);
    expect(drawRandomSubset([1, 2], 10)).toHaveLength(2);
  });
});
