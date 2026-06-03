import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, teacherProcedure } from "~/server/api/trpc";
import { activities, courses, courseSections, fileResources } from "~/server/db/schema";

export const fileRouter = createTRPCRouter({
  /** Get file resource for an activity. */
  getByActivity: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [file] = await ctx.db
        .select()
        .from(fileResources)
        .where(eq(fileResources.activityId, input.activityId))
        .limit(1);
      return file ?? null;
    }),

  /** Upsert file resource (teacher). */
  upsert: teacherProcedure
    .input(
      z.object({
        activityId: z.number().int(),
        storageKey: z.string().min(1),
        originalName: z.string().min(1),
        mimeType: z.string().min(1),
        sizeBytes: z.number().int(),
        forceDownload: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify teacher owns the course
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
      const [file] = await ctx.db
        .insert(fileResources)
        .values(input)
        .onConflictDoUpdate({
          target: [fileResources.activityId],
          set: {
            storageKey: input.storageKey,
            originalName: input.originalName,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            forceDownload: input.forceDownload,
          },
        })
        .returning();
      return file;
    }),

  /** Delete a file resource (teacher). */
  delete: teacherProcedure
    .input(z.object({ activityId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(fileResources).where(eq(fileResources.activityId, input.activityId));
    }),
});
