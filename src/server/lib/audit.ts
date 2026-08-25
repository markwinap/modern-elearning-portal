import { db } from "~/server/db";
import { auditLogs } from "~/server/db/schema";
import { getClientIp } from "./rate-limit";

export interface AuditEventOptions {
  action: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string | number;
  metadata?: Record<string, unknown>;
}

export interface AuditContext {
  session?: { user?: { id: string } } | null;
  headers: Headers;
}

export async function logAuditEvent(
  ctx: AuditContext,
  options: AuditEventOptions,
): Promise<void> {
  const actorId = options.actorId ?? ctx.session?.user?.id;
  const ip = getClientIp(ctx.headers);
  const userAgent = ctx.headers.get("user-agent") ?? undefined;

  await db.insert(auditLogs).values({
    actorId,
    action: options.action,
    resourceType: options.resourceType ?? null,
    resourceId:
      options.resourceId !== undefined
        ? String(options.resourceId)
        : null,
    metadata: options.metadata ?? {},
    ipAddress: ip,
    userAgent: userAgent ?? null,
  });
}
