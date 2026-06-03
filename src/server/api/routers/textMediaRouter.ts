import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, teacherProcedure } from "~/server/api/trpc";
import { activities, courses, courseSections, textMediaBlocks } from "~/server/db/schema";

export const textMediaRouter = createTRPCRouter({
  /** Get text/media content for an activity. */
  getByActivity: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [block] = await ctx.db
        .select()
        .from(textMediaBlocks)
        .where(eq(textMediaBlocks.activityId, input.activityId))
        .limit(1);
      return block ?? null;
    }),

  /** Upsert markdown content (teacher). */
  upsert: teacherProcedure
    .input(z.object({ activityId: z.number().int(), content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [section] = await ctx.db
        .select({ courseId: courseSections.courseId })
        .from(activities)
        .innerJoin(courseSections, eq(activities.sectionId, courseSections.id))
        .where(eq(activities.id, input.activityId))
        .limit(1);
      if (!section) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, section.courseId))
        .limit(1);
      const role = ctx.session.user.role as string | undefined;
      if (course?.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [block] = await ctx.db
        .insert(textMediaBlocks)
        .values({ activityId: input.activityId, content: input.content })
        .onConflictDoUpdate({
          target: [textMediaBlocks.activityId],
          set: { content: input.content, updatedAt: new Date() },
        })
        .returning();
      return block;
    }),
});
