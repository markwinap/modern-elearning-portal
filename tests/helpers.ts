import type { Session } from "~/server/better-auth/config";

export function createTestSession(
  user: {
    id: string;
    name: string;
    email: string;
    role: "student" | "teacher" | "admin";
  },
): Session {
  const now = new Date();
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      image: null,
      role: user.role,
      banned: false,
      banReason: null,
      banExpires: null,
      createdAt: now,
      updatedAt: now,
    },
    session: {
      id: crypto.randomUUID(),
      userId: user.id,
      token: "test-token",
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    },
  };
}
