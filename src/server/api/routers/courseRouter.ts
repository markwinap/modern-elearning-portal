import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import { courseSessions, courses, enrollments, user } from "~/server/db/schema";

const courseInputSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().optional(),
  categoryId: z.number().int(),
  coverImageUrl: z.string().url().optional(),
  maxEnrollments: z.number().int().positive().optional(),
  locationType: z.enum(["online", "onsite"]),
  siteLocation: z.string().optional(),
  classroom: z.string().optional(),
  instructorBio: z.string().optional(),
  teacherId: z.string().optional(),
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
      if (input.categoryId)
        conditions.push(eq(courses.categoryId, input.categoryId));
      if (input.search)
        conditions.push(ilike(courses.title, `%${input.search}%`));

      return ctx.db
        .select({
          id: courses.id,
          title: courses.title,
          description: courses.description,
          coverImageUrl: courses.coverImageUrl,
          slug: courses.slug,
          locationType: courses.locationType,
          siteLocation: courses.siteLocation,
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

      const [teacher] = await ctx.db
        .select({
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(user)
        .where(eq(user.id, course.teacherId))
        .limit(1);

      const sessions = await ctx.db
        .select()
        .from(courseSessions)
        .where(eq(courseSessions.courseId, course.id))
        .orderBy(asc(courseSessions.dayOfWeek), asc(courseSessions.startTime));

      return {
        ...course,
        teacherName: teacher?.name ?? null,
        teacherEmail: teacher?.email ?? null,
        teacherImage: teacher?.image ?? null,
        sessions,
      };
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

      const sessions = await ctx.db
        .select()
        .from(courseSessions)
        .where(eq(courseSessions.courseId, course.id))
        .orderBy(asc(courseSessions.dayOfWeek), asc(courseSessions.startTime));

      return { ...course, sessions };
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
        .values({
          ...input,
          slug,
          teacherId: ctx.session.user.id,
          status: "draft",
        })
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

      if (data.teacherId && data.teacherId !== existing.teacherId) {
        if (role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can reassign course teachers",
          });
        }
        const [teacher] = await ctx.db
          .select({ role: user.role })
          .from(user)
          .where(eq(user.id, data.teacherId))
          .limit(1);
        if (
          !teacher ||
          (teacher.role !== "teacher" && teacher.role !== "admin")
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid teacher selected",
          });
        }
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
      await ctx.db
        .update(courses)
        .set({ status: "published" })
        .where(eq(courses.id, input.id));
    }),

  archive: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(courses)
        .set({ status: "archived" })
        .where(eq(courses.id, input.id));
    }),

  listSessions: protectedProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(courseSessions)
        .where(eq(courseSessions.courseId, input.courseId))
        .orderBy(asc(courseSessions.dayOfWeek), asc(courseSessions.startTime));
    }),

  createSession: teacherProcedure
    .input(
      z.object({
        courseId: z.number().int(),
        dayOfWeek: z.number().int().min(0).max(6),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
        endTime: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
        location: z.string().optional(),
        classroom: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      const role = ctx.session.user.role as string | undefined;
      if (course.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [session] = await ctx.db
        .insert(courseSessions)
        .values({
          courseId: input.courseId,
          dayOfWeek: input.dayOfWeek,
          startDate: input.startDate,
          endDate: input.endDate,
          startTime: input.startTime,
          endTime: input.endTime,
          location: input.location,
          classroom: input.classroom,
        })
        .returning();
      return session;
    }),

  updateSession: teacherProcedure
    .input(
      z.object({
        id: z.number().int(),
        dayOfWeek: z.number().int().min(0).max(6),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
        endTime: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
        location: z.string().optional(),
        classroom: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [existing] = await ctx.db
        .select({ courseId: courseSessions.courseId })
        .from(courseSessions)
        .where(eq(courseSessions.id, id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, existing.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      const role = ctx.session.user.role as string | undefined;
      if (course.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [session] = await ctx.db
        .update(courseSessions)
        .set(data)
        .where(eq(courseSessions.id, id))
        .returning();
      return session;
    }),

  deleteSession: teacherProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ courseId: courseSessions.courseId })
        .from(courseSessions)
        .where(eq(courseSessions.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, existing.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      const role = ctx.session.user.role as string | undefined;
      if (course.teacherId !== ctx.session.user.id && role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db
        .delete(courseSessions)
        .where(eq(courseSessions.id, input.id));
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
          locationType: courses.locationType,
          siteLocation: courses.siteLocation,
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
