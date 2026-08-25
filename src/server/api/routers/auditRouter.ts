import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import { auditLogs, user } from "~/server/db/schema";

export const auditRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(25),
        action: z.string().optional(),
        resourceType: z.string().optional(),
        actorId: z.string().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      const conditions = [];

      if (input.action) {
        conditions.push(ilike(auditLogs.action, `%${input.action}%`));
      }
      if (input.resourceType) {
        conditions.push(
          ilike(auditLogs.resourceType, `%${input.resourceType}%`),
        );
      }
      if (input.actorId) {
        conditions.push(eq(auditLogs.actorId, input.actorId));
      }
      if (input.search) {
        conditions.push(
          sql`${auditLogs.metadata}::text ilike ${`%${input.search}%`}`,
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await ctx.db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          resourceType: auditLogs.resourceType,
          resourceId: auditLogs.resourceId,
          metadata: auditLogs.metadata,
          ipAddress: auditLogs.ipAddress,
          userAgent: auditLogs.userAgent,
          createdAt: auditLogs.createdAt,
          actorName: user.name,
          actorEmail: user.email,
        })
        .from(auditLogs)
        .leftJoin(user, eq(auditLogs.actorId, user.id))
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit)
        .offset(offset);

      const [countRow] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(where);

      return {
        logs: rows,
        total: countRow?.count ?? 0,
      };
    }),

  actions: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs);
    return rows.map((row) => row.action);
  }),

  resourceTypes: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .selectDistinct({ resourceType: auditLogs.resourceType })
      .from(auditLogs);
    return rows
      .map((row) => row.resourceType)
      .filter((r): r is string => r !== null);
  }),
});
