import { TRPCError } from "@trpc/server";

/**
 * Asserts that the current user owns a resource (e.g. is the course's teacher) or is an admin.
 * Centralizes the "teacherId === session.user.id || role === admin" check duplicated across
 * course/gradebook/section/quiz procedures.
 *
 * Kept in its own module (no `db`/`better-auth` imports) so it can be unit tested without
 * requiring database or auth environment configuration.
 */
export function assertOwnerOrAdmin(
  ctx: { session: { user: { id: string; role?: string | null } } },
  ownerId: string | undefined,
) {
  if (ownerId !== ctx.session.user.id && ctx.session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}
