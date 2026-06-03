import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { messageThreads, messages } from "~/server/db/schema";

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

  /** Create a new thread. */
  createThread: protectedProcedure
    .input(z.object({ courseId: z.number().int(), subject: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const [thread] = await ctx.db
        .insert(messageThreads)
        .values({ courseId: input.courseId, subject: input.subject, createdBy: ctx.session.user.id })
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
        .select()
        .from(messageThreads)
        .where(eq(messageThreads.id, input.threadId))
        .limit(1);
      if (!thread) throw new TRPCError({ code: "NOT_FOUND" });
      const [msg] = await ctx.db
        .insert(messages)
        .values({ threadId: input.threadId, authorId: ctx.session.user.id, content: input.content, sentAt: new Date() })
        .returning();
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
      const role = ctx.session.user.role as string | undefined;
      if (msg.authorId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.delete(messages).where(eq(messages.id, input.messageId));
    }),
});
