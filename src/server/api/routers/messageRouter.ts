import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { createNotification } from "~/server/lib/notifications";
import {
  courses,
  enrollments,
  messageThreads,
  messages,
} from "~/server/db/schema";

export const messageRouter = createTRPCRouter({
  /** List threads for a course. */
  listByCourse: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(messageThreads)
        .where(eq(messageThreads.courseId, input.courseId))
        .orderBy(desc(messageThreads.createdAt));
    }),

  /** List threads across all courses the user is enrolled in. */
  listMyThreads: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: messageThreads.id,
        courseId: messageThreads.courseId,
        subject: messageThreads.subject,
        createdBy: messageThreads.createdBy,
        createdAt: messageThreads.createdAt,
        courseTitle: courses.title,
      })
      .from(messageThreads)
      .innerJoin(courses, eq(messageThreads.courseId, courses.id))
      .innerJoin(
        enrollments,
        and(
          eq(enrollments.courseId, courses.id),
          eq(enrollments.userId, ctx.session.user.id),
        ),
      )
      .orderBy(desc(messageThreads.createdAt));
  }),

  /** Create a new thread. */
  createThread: protectedProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        subject: z.string().min(1).max(256),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [thread] = await ctx.db
        .insert(messageThreads)
        .values({
          courseId: input.courseId,
          subject: input.subject,
          createdBy: ctx.session.user.id,
        })
        .returning();
      return thread;
    }),

  /** Get messages in a thread. */
  getMessages: protectedProcedure
    .input(z.object({ threadId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [thread] = await ctx.db
        .select()
        .from(messageThreads)
        .where(eq(messageThreads.id, input.threadId))
        .limit(1);
      if (!thread) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db
        .select()
        .from(messages)
        .where(eq(messages.threadId, input.threadId))
        .orderBy(asc(messages.sentAt));
    }),

  /** Send a message in a thread. */
  sendMessage: protectedProcedure
    .input(z.object({ threadId: z.number().int(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [thread] = await ctx.db
        .select({
          id: messageThreads.id,
          courseId: messageThreads.courseId,
          subject: messageThreads.subject,
          createdBy: messageThreads.createdBy,
        })
        .from(messageThreads)
        .where(eq(messageThreads.id, input.threadId))
        .limit(1);
      if (!thread) throw new TRPCError({ code: "NOT_FOUND" });

      let courseContext:
        | { id: number; slug: string; title: string }
        | undefined;
      if (thread.courseId) {
        const [course] = await ctx.db
          .select({ id: courses.id, slug: courses.slug, title: courses.title })
          .from(courses)
          .where(eq(courses.id, thread.courseId))
          .limit(1);
        courseContext = course;
      }

      const [msg] = await ctx.db
        .insert(messages)
        .values({
          threadId: input.threadId,
          authorId: ctx.session.user.id,
          content: input.content,
          sentAt: new Date(),
        })
        .returning();
      if (!msg) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      if (thread.createdBy !== ctx.session.user.id) {
        await createNotification({
          userId: thread.createdBy,
          type: "discussion_message",
          payload: {
            threadId: thread.id,
            subject: thread.subject,
            courseId: courseContext?.id,
            courseSlug: courseContext?.slug,
            courseTitle: courseContext?.title,
            messageId: msg.id,
          },
        });
      }

      return msg;
    }),

  /** Delete a message (author or admin). */
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [msg] = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.id, input.messageId))
        .limit(1);
      if (!msg) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, msg.authorId);
      await ctx.db.delete(messages).where(eq(messages.id, input.messageId));
    }),
});
