import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { assertOwnerOrAdmin } from "~/server/api/ownership";

function ctxFor(userId: string, role?: string | null) {
  return { session: { user: { id: userId, role } } };
}

describe("assertOwnerOrAdmin", () => {
  it("allows the resource owner", () => {
    const ctx = ctxFor("teacher-1", "teacher");
    expect(() => assertOwnerOrAdmin(ctx, "teacher-1")).not.toThrow();
  });

  it("allows an admin even when they don't own the resource", () => {
    const ctx = ctxFor("admin-1", "admin");
    expect(() => assertOwnerOrAdmin(ctx, "someone-else")).not.toThrow();
  });

  it("throws FORBIDDEN for a non-owner, non-admin user", () => {
    const ctx = ctxFor("student-1", "student");
    expect(() => assertOwnerOrAdmin(ctx, "teacher-1")).toThrow(TRPCError);
    try {
      assertOwnerOrAdmin(ctx, "teacher-1");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("FORBIDDEN");
    }
  });

  it("throws FORBIDDEN when ownerId is undefined (e.g. resource not found) and user is not admin", () => {
    const ctx = ctxFor("student-1", "student");
    expect(() => assertOwnerOrAdmin(ctx, undefined)).toThrow(TRPCError);
  });

  it("allows an admin even when ownerId is undefined", () => {
    const ctx = ctxFor("admin-1", "admin");
    expect(() => assertOwnerOrAdmin(ctx, undefined)).not.toThrow();
  });

  it("throws FORBIDDEN when role is missing entirely and the user is not the owner", () => {
    const ctx = ctxFor("user-1", null);
    expect(() => assertOwnerOrAdmin(ctx, "someone-else")).toThrow(TRPCError);
  });
});
