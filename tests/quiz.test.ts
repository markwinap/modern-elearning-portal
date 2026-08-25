// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  gradeAnswer,
  isStringArray,
  isValidAnswerForType,
  isValidCorrectAnswerForType,
  isValidOptionsForType,
} from "~/lib/quiz";

describe("quiz type guards", () => {
  it("identifies string arrays", () => {
    expect(isStringArray(["a", "b"])).toBe(true);
    expect(isStringArray([1, 2])).toBe(false);
    expect(isStringArray("not array")).toBe(false);
  });

  it("validates options per question type", () => {
    expect(isValidOptionsForType("multiple_choice", ["a", "b"])).toBe(true);
    expect(isValidOptionsForType("multiple_choice", [])).toBe(false);
    expect(isValidOptionsForType("true_false", undefined)).toBe(true);
    expect(isValidOptionsForType("short_answer", undefined)).toBe(true);
    expect(isValidOptionsForType("essay", undefined)).toBe(true);
    expect(isValidOptionsForType("matching", [
      { left: "A", right: "B" },
    ])).toBe(true);
  });

  it("validates correct answers per question type", () => {
    expect(
      isValidCorrectAnswerForType("multiple_choice", "a", ["a", "b"]),
    ).toBe(true);
    expect(
      isValidCorrectAnswerForType("multiple_choice", "c", ["a", "b"]),
    ).toBe(false);
    expect(
      isValidCorrectAnswerForType(
        "multiple_choice",
        ["a", "b"],
        ["a", "b", "c"],
      ),
    ).toBe(true);
    expect(isValidCorrectAnswerForType("true_false", "true", undefined)).toBe(
      true,
    );
    expect(isValidCorrectAnswerForType("true_false", "maybe", undefined)).toBe(
      false,
    );
    expect(
      isValidCorrectAnswerForType("short_answer", "Paris", undefined),
    ).toBe(true);
    expect(
      isValidCorrectAnswerForType("matching", { A: "B" }, [
        { left: "A", right: "B" },
      ]),
    ).toBe(true);
  });

  it("validates student answers per question type", () => {
    expect(isValidAnswerForType("multiple_choice", "a")).toBe(true);
    expect(isValidAnswerForType("multiple_choice", ["a", "b"])).toBe(true);
    expect(isValidAnswerForType("true_false", "true")).toBe(true);
    expect(isValidAnswerForType("true_false", false)).toBe(false);
    expect(isValidAnswerForType("short_answer", "hello")).toBe(true);
    expect(isValidAnswerForType("ordering", ["a", "b"])).toBe(true);
    expect(isValidAnswerForType("essay", "essay text")).toBe(true);
  });
});

describe("gradeAnswer", () => {
  it("grades multiple choice single answer", () => {
    expect(gradeAnswer("a", "a")).toBe(true);
    expect(gradeAnswer("a", "b")).toBe(false);
  });

  it("grades multiple choice multi-select answers order-independently", () => {
    expect(gradeAnswer(["a", "b"], ["b", "a"])).toBe(true);
    expect(gradeAnswer(["a", "b"], ["a"])).toBe(false);
  });

  it("grades true/false after normalizing booleans", () => {
    expect(gradeAnswer("true", true)).toBe(true);
    expect(gradeAnswer("false", false)).toBe(true);
    expect(gradeAnswer("true", "false")).toBe(false);
  });

  it("grades short answer case-sensitively", () => {
    expect(gradeAnswer("Paris", "Paris")).toBe(true);
    expect(gradeAnswer("Paris", "paris")).toBe(false);
  });

  it("grades matching by sorted key/value pairs", () => {
    expect(gradeAnswer({ b: "2", a: "1" }, { a: "1", b: "2" })).toBe(true);
    expect(gradeAnswer({ a: "1" }, { a: "2" })).toBe(false);
  });

  it("returns false when the correct answer is undefined", () => {
    expect(gradeAnswer(undefined, "anything")).toBe(false);
  });
});
