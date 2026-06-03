import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { courses, enrollments, user } from "~/server/db/schema";

const courseInputSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  categoryId: z.number().int(),
  coverImageUrl: z.string().url().optional(),
  maxEnrollments: z.number().int().positive().optional(),
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
  accessKey: z.string().max(64).optional(),
});

export const courseRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(12),
        categoryId: z.number().int().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      const conditions = [eq(courses.status, "published")];
      if (input.categoryId) conditions.push(eq(courses.categoryId, input.categoryId));
      if (input.search) conditions.push(ilike(courses.title, `%${input.search}%`));

      return ctx.db
        .select({
          id: courses.id,
          title: courses.title,
          description: courses.description,
          coverImageUrl: courses.coverImageUrl,
          slug: courses.slug,
          createdAt: courses.createdAt,
          teacherName: user.name,
        })
        .from(courses)
        .leftJoin(user, eq(courses.teacherId, user.id))
        .where(and(...conditions))
        .orderBy(desc(courses.createdAt))
        .limit(input.limit)
        .offset(offset);
    }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select()
        .from(courses)
        .where(eq(courses.slug, input.slug))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      return course;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select()
        .from(courses)
        .where(eq(courses.id, input.id))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      return course;
    }),

  getMyCourses: teacherProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(courses)
      .where(eq(courses.teacherId, ctx.session.user.id))
      .orderBy(desc(courses.createdAt));
  }),

  create: teacherProcedure
    .input(courseInputSchema)
    .mutation(async ({ ctx, input }) => {
      const slug =
        input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") +
        "-" +
        Date.now().toString(36);

      const [course] = await ctx.db
        .insert(courses)
        .values({ ...input, slug, teacherId: ctx.session.user.id, status: "draft" })
        .returning();
      return course;
    }),

  update: protectedProcedure
    .input(courseInputSchema.partial().extend({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [existing] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const role = ctx.session.user.role as string | undefined;
      if (existing.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.update(courses).set(data).where(eq(courses.id, id));
    }),

  publish: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const role = ctx.session.user.role as string | undefined;
      if (existing.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db.update(courses).set({ status: "published" }).where(eq(courses.id, input.id));
    }),

  archive: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(courses).set({ status: "archived" }).where(eq(courses.id, input.id));
    }),

  getEnrollmentCount: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(eq(enrollments.courseId, input.courseId));
      return result?.count ?? 0;
    }),

  listAll: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;
      return ctx.db
        .select({
          id: courses.id,
          title: courses.title,
          slug: courses.slug,
          status: courses.status,
          createdAt: courses.createdAt,
          teacherName: user.name,
        })
        .from(courses)
        .leftJoin(user, eq(courses.teacherId, user.id))
        .orderBy(desc(courses.createdAt))
        .limit(input.limit)
        .offset(offset);
    }),
});
