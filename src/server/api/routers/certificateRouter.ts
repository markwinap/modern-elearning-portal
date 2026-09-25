import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  assertOwnerOrAdmin,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  teacherProcedure,
} from "~/server/api/trpc";
import {
  buildBadgeAssertionJson,
  issueCertificateForCourse,
} from "~/server/lib/certificates";
import {
  badgeAssertions,
  certificates,
  certificateTemplates,
  courses,
  user,
} from "~/server/db/schema";

const templateInputSchema = z.object({
  courseId: z.number().int(),
  name: z.string().min(1).max(128),
  title: z.string().min(1).max(256),
  issuer: z.string().min(1).max(256),
  signerName: z.string().max(256).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#1677ff"),
  autoIssue: z.boolean().default(true),
  validityDays: z.number().int().min(0).nullable().optional(),
});

export const certificateRouter = createTRPCRouter({
  myCertificates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: certificates.id,
        serial: certificates.serial,
        issuedAt: certificates.issuedAt,
        expiresAt: certificates.expiresAt,
        revokedAt: certificates.revokedAt,
        courseTitle: courses.title,
      })
      .from(certificates)
      .innerJoin(courses, eq(certificates.courseId, courses.id))
      .where(eq(certificates.userId, ctx.session.user.id))
      .orderBy(desc(certificates.issuedAt));
  }),

  myBadges: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: badgeAssertions.id,
        uid: badgeAssertions.uid,
        name: badgeAssertions.name,
        description: badgeAssertions.description,
        issuedOn: badgeAssertions.issuedOn,
        expiresAt: badgeAssertions.expiresAt,
        revokedAt: badgeAssertions.revokedAt,
      })
      .from(badgeAssertions)
      .where(eq(badgeAssertions.userId, ctx.session.user.id))
      .orderBy(desc(badgeAssertions.issuedOn));
  }),

  downloadSvg: protectedProcedure
    .input(z.object({ serial: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const [cert] = await ctx.db
        .select({ userId: certificates.userId, svg: certificates.svg })
        .from(certificates)
        .where(eq(certificates.serial, input.serial))
        .limit(1);
      if (!cert) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, cert.userId);
      return cert.svg;
    }),

  verify: publicProcedure
    .input(z.object({ serial: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const [cert] = await ctx.db
        .select({
          serial: certificates.serial,
          issuedAt: certificates.issuedAt,
          expiresAt: certificates.expiresAt,
          revokedAt: certificates.revokedAt,
          courseTitle: courses.title,
          learnerName: user.name,
        })
        .from(certificates)
        .innerJoin(courses, eq(certificates.courseId, courses.id))
        .innerJoin(user, eq(certificates.userId, user.id))
        .where(eq(certificates.serial, input.serial))
        .limit(1);
      if (!cert) return { valid: false as const, reason: "not_found" as const };
      if (cert.revokedAt)
        return {
          valid: false as const,
          reason: "revoked" as const,
          certificate: cert,
        };
      if (cert.expiresAt && cert.expiresAt < new Date())
        return {
          valid: false as const,
          reason: "expired" as const,
          certificate: cert,
        };
      return { valid: true as const, reason: null, certificate: cert };
    }),

  verifyBadge: publicProcedure
    .input(z.object({ uid: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const [assertion] = await ctx.db
        .select()
        .from(badgeAssertions)
        .where(eq(badgeAssertions.uid, input.uid))
        .limit(1);
      if (!assertion)
        return { valid: false as const, reason: "not_found" as const };
      if (assertion.revokedAt)
        return { valid: false as const, reason: "revoked" as const, assertion };
      if (assertion.expiresAt && assertion.expiresAt < new Date())
        return { valid: false as const, reason: "expired" as const, assertion };
      return { valid: true as const, reason: null, assertion };
    }),

  badgeJson: publicProcedure
    .input(
      z.object({
        uid: z.string().min(1).max(64),
        baseUrl: z.string().url().default("http://localhost:3000"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          assertion: badgeAssertions,
          courseTitle: courses.title,
          email: user.email,
        })
        .from(badgeAssertions)
        .innerJoin(courses, eq(badgeAssertions.courseId, courses.id))
        .innerJoin(user, eq(badgeAssertions.userId, user.id))
        .where(eq(badgeAssertions.uid, input.uid))
        .limit(1);
      if (!row || row.assertion.revokedAt)
        throw new TRPCError({ code: "NOT_FOUND" });
      return buildBadgeAssertionJson({
        uid: row.assertion.uid,
        name: row.assertion.name,
        description: row.assertion.description,
        learnerEmail: row.email,
        courseTitle: row.courseTitle,
        issuedOn: row.assertion.issuedOn,
        expiresAt: row.assertion.expiresAt,
        baseUrl: input.baseUrl,
      });
    }),

  getTemplate: teacherProcedure
    .input(z.object({ courseId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(certificateTemplates)
        .where(eq(certificateTemplates.courseId, input.courseId))
        .limit(1);
      return template ?? null;
    }),

  upsertTemplate: teacherProcedure
    .input(templateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);
      const [existing] = await ctx.db
        .select({ id: certificateTemplates.id })
        .from(certificateTemplates)
        .where(eq(certificateTemplates.courseId, input.courseId))
        .limit(1);
      if (existing) {
        const [updated] = await ctx.db
          .update(certificateTemplates)
          .set(input)
          .where(eq(certificateTemplates.id, existing.id))
          .returning();
        return updated;
      }
      const [template] = await ctx.db
        .insert(certificateTemplates)
        .values(input)
        .returning();
      return template;
    }),

  issueManual: teacherProcedure
    .input(z.object({ courseId: z.number().int(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [course] = await ctx.db
        .select({ teacherId: courses.teacherId })
        .from(courses)
        .where(eq(courses.id, input.courseId))
        .limit(1);
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, course.teacherId);
      return issueCertificateForCourse(ctx.db, input.userId, input.courseId);
    }),

  revoke: teacherProcedure
    .input(z.object({ serial: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const [cert] = await ctx.db
        .select({ id: certificates.id, teacherId: courses.teacherId })
        .from(certificates)
        .innerJoin(courses, eq(certificates.courseId, courses.id))
        .where(eq(certificates.serial, input.serial))
        .limit(1);
      if (!cert) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, cert.teacherId);
      await ctx.db
        .update(certificates)
        .set({ revokedAt: new Date() })
        .where(eq(certificates.id, cert.id));
      await ctx.db
        .update(badgeAssertions)
        .set({ revokedAt: new Date() })
        .where(eq(badgeAssertions.certificateId, cert.id));
    }),

  renew: protectedProcedure
    .input(z.object({ serial: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const [cert] = await ctx.db
        .select({
          id: certificates.id,
          userId: certificates.userId,
          expiresAt: certificates.expiresAt,
          validityDays: certificateTemplates.validityDays,
        })
        .from(certificates)
        .leftJoin(
          certificateTemplates,
          eq(certificates.templateId, certificateTemplates.id),
        )
        .where(eq(certificates.serial, input.serial))
        .limit(1);
      if (!cert) throw new TRPCError({ code: "NOT_FOUND" });
      assertOwnerOrAdmin(ctx, cert.userId);
      if (!cert.expiresAt || cert.expiresAt > new Date())
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Certificate is not expired",
        });
      const days = cert.validityDays ?? 365;
      const expiresAt = new Date(Date.now() + days * 86_400_000);
      await ctx.db
        .update(certificates)
        .set({ expiresAt })
        .where(eq(certificates.id, cert.id));
      await ctx.db
        .update(badgeAssertions)
        .set({ expiresAt })
        .where(eq(badgeAssertions.certificateId, cert.id));
      return { expiresAt };
    }),
});
