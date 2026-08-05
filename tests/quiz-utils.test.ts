import { describe, expect, it } from "vitest";
import { mulberry32, seededShuffle } from "~/lib/quiz-utils";

describe("quiz-utils", () => {
  describe("mulberry32", () => {
    it("produces the same sequence for the same seed", () => {
      const a = mulberry32(12345);
      const b = mulberry32(12345);
      for (let i = 0; i < 100; i++) {
        expect(a()).toBe(b());
      }
    });

    it("produces values in the [0, 1) range", () => {
      const random = mulberry32(1);
      for (let i = 0; i < 100; i++) {
        const value = random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it("produces different sequences for different seeds", () => {
      const a = mulberry32(12345);
      const b = mulberry32(54321);
      const firstA = a();
      const firstB = b();
      expect(firstA).not.toBe(firstB);
    });
  });

  describe("seededShuffle", () => {
    it("is deterministic for the same seed and input", () => {
      const input = [1, 2, 3, 4, 5];
      const a = seededShuffle(input, 12345);
      const b = seededShuffle(input, 12345);
      expect(a).toEqual(b);
    });

    it("produces a different order for different seeds", () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const a = seededShuffle(input, 12345);
      const b = seededShuffle(input, 54321);
      expect(a).not.toEqual(input);
      expect(b).not.toEqual(input);
      expect(a).not.toEqual(b);
    });

    it("returns a new array and does not mutate the original", () => {
      const input = [1, 2, 3];
      const shuffled = seededShuffle(input, 1);
      expect(shuffled).not.toBe(input);
      expect(input).toEqual([1, 2, 3]);
    });

    it("returns all elements with no duplicates or omissions", () => {
      const input = ["a", "b", "c", "d", "e"];
      const shuffled = seededShuffle(input, 999);
      expect(shuffled).toHaveLength(input.length);
      expect(new Set(shuffled).size).toBe(input.length);
      expect(shuffled.slice().sort()).toEqual(input.slice().sort());
    });
  });
});
