// @vitest-environment node

import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { auditLogs } from "~/server/db/schema";
import { db } from "~/server/db";
import { logAuditEvent } from "~/server/lib/audit";
import {
  checkRateLimit,
  getClientIp,
  getRateLimitKey,
} from "~/server/lib/rate-limit";

describe("rate-limit utility", () => {
  it("allows requests under the limit", () => {
    const key = `test:allow:${Date.now()}`;
    const config = { maxRequests: 3, windowSeconds: 60 };
    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(true);
  });

  it("blocks requests over the limit", () => {
    const key = `test:block:${Date.now()}`;
    const config = { maxRequests: 2, windowSeconds: 60 };
    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(false);
  });

  it("resets after the window expires", async () => {
    const key = `test:window:${Date.now()}`;
    const config = { maxRequests: 1, windowSeconds: 0 };
    expect(checkRateLimit(key, config)).toBe(true);
    expect(checkRateLimit(key, config)).toBe(true);
  });

  it("builds an IP-based key when no user is provided", () => {
    expect(getRateLimitKey({ type: "public", ip: "127.0.0.1" })).toBe(
      "ip:127.0.0.1:public",
    );
  });

  it("builds a user-based key when a user id is provided", () => {
    expect(
      getRateLimitKey({
        type: "protected",
        userId: "user_123",
        ip: "127.0.0.1",
      }),
    ).toBe("user:user_123:protected");
  });

  it("extracts the first forwarded-for IP", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.1, 70.41.3.18",
    });
    expect(getClientIp(headers)).toBe("203.0.113.1");
  });
});

describe("audit log helper", () => {
  it("records an audit event with resource, metadata, and request details", async () => {
    const actionName = `test.audit.${Date.now()}`;
    await logAuditEvent(
      {
        session: undefined,
        headers: new Headers({
          "user-agent": "vitest",
          "x-forwarded-for": "198.51.100.1",
        }),
      },
      {
        action: actionName,
        resourceType: "test_resource",
        resourceId: 42,
        metadata: { detail: "test metadata" },
      },
    );

    const rows = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, actionName),
          eq(auditLogs.resourceType, "test_resource"),
        ),
      );

    expect(rows.length).toBe(1);
    const log = rows[0];
    expect(log).toBeDefined();
    if (!log) return;
    expect(log.actorId).toBeNull();
    expect(log.ipAddress).toBe("198.51.100.1");
    expect(log.userAgent).toBe("vitest");
    expect(log.resourceId).toBe("42");
    expect(log.metadata).toEqual({ detail: "test metadata" });

    await db.delete(auditLogs).where(eq(auditLogs.id, log.id));
  });
});
