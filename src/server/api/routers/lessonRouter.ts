import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, teacherProcedure } from "~/server/api/trpc";
import { activities, courses, courseSections, lessonNodes } from "~/server/db/schema";

export const lessonRouter = createTRPCRouter({
  /** Get the flow graph for a lesson activity. */
  getGraph: protectedProcedure
    .input(z.object({ activityId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(lessonNodes)
        .where(eq(lessonNodes.activityId, input.activityId))
        .limit(1);
      return row?.graph ?? null;
    }),

  /** Save the flow graph (teacher). */
  saveGraph: teacherProcedure
    .input(
      z.object({
        activityId: z.number().int(),
        graph: z.record(z.unknown()),
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
      await ctx.db
        .insert(lessonNodes)
        .values({ activityId: input.activityId, graph: input.graph })
        .onConflictDoUpdate({
          target: [lessonNodes.activityId],
          set: { graph: input.graph, updatedAt: new Date() },
        });
    }),
});
