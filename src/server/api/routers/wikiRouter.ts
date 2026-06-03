import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, teacherProcedure } from "~/server/api/trpc";
import { wikiPages, wikiRevisions } from "~/server/db/schema";

export const wikiRouter = createTRPCRouter({
  /** List wiki pages for an activity. */
  listPages: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.select().from(wikiPages).where(eq(wikiPages.activityId, input.activityId));
    }),

  /** Get a wiki page by id. */
  getPage: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select()
        .from(wikiPages)
        .where(eq(wikiPages.id, input.id))
        .limit(1);
      if (!page) throw new TRPCError({ code: "NOT_FOUND" });
      return page;
    }),

  /** Create or update a wiki page. */
  upsertPage: protectedProcedure
    .input(
      z.object({
        id: z.number().int().optional(),
        activityId: z.number().int(),
        title: z.string().min(1).max(256),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        // Update existing page
        const [existing] = await ctx.db
          .select()
          .from(wikiPages)
          .where(eq(wikiPages.id, input.id))
          .limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const newVersion = (existing.version ?? 1) + 1;

        // Save revision
        await ctx.db.insert(wikiRevisions).values({
          wikiPageId: input.id,
          content: existing.content,
          authorId: ctx.session.user.id,
          version: existing.version ?? 1,
        });

        const [updated] = await ctx.db
          .update(wikiPages)
          .set({ title: input.title, content: input.content, version: newVersion, authorId: ctx.session.user.id })
          .where(eq(wikiPages.id, input.id))
          .returning();
        return updated;
      } else {
        // Create new page
        const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
        const [page] = await ctx.db
          .insert(wikiPages)
          .values({
            activityId: input.activityId,
            title: input.title,
            slug,
            content: input.content,
            authorId: ctx.session.user.id,
            version: 1,
          })
          .returning();
        return page;
      }
    }),

  /** Get revision history for a page. */
  getRevisions: protectedProcedure
    .input(z.object({ wikiPageId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(wikiRevisions)
        .where(eq(wikiRevisions.wikiPageId, input.wikiPageId))
        .orderBy(desc(wikiRevisions.createdAt));
    }),

  /** Lock a page (teacher). */
  lockPage: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(wikiPages).set({ lockedBy: ctx.session.user.id }).where(eq(wikiPages.id, input.id));
    }),

  /** Unlock a page (teacher). */
  unlockPage: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(wikiPages).set({ lockedBy: null }).where(eq(wikiPages.id, input.id));
    }),
});
