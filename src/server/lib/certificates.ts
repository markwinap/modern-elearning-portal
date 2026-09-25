import { createHash, randomBytes } from "node:crypto";

import { and, eq, type ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";

import type { db } from "~/server/db";
import type * as schema from "~/server/db/schema";
import {
  badgeAssertions,
  certificates,
  certificateTemplates,
  courses,
  user,
} from "~/server/db/schema";

type Database =
  | typeof db
  | PgTransaction<
      PostgresJsQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;

export function generateSerial(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

import { renderCertificateSvg } from "~/lib/certificate-render";
export { renderCertificateSvg };

export function buildBadgeAssertionJson(assertion: {
  uid: string;
  name: string;
  description: string | null;
  learnerEmail: string;
  courseTitle: string;
  issuedOn: Date;
  expiresAt: Date | null;
  baseUrl: string;
}) {
  return {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Assertion",
    id: `${assertion.baseUrl}/badge/${assertion.uid}/assertion`,
    uid: assertion.uid,
    recipient: {
      type: "email",
      identity: createHash("sha256")
        .update(assertion.learnerEmail)
        .digest("hex"),
      hashed: true,
      salt: "modern-elearning-portal",
    },
    badge: {
      type: "BadgeClass",
      name: assertion.name,
      description:
        assertion.description ?? `Completed ${assertion.courseTitle}`,
      criteria: {
        narrative: `Completed the course "${assertion.courseTitle}".`,
      },
      issuer: { type: "Profile", name: "Modern E-Learning Portal" },
    },
    verification: {
      type: "HostedBadge",
      verificationUrl: `${assertion.baseUrl}/badge/${assertion.uid}`,
    },
    issuedOn: assertion.issuedOn.toISOString(),
    expires: assertion.expiresAt?.toISOString(),
  };
}

export async function issueCertificateForCourse(
  database: Database,
  userId: string,
  courseId: number,
) {
  const [[existing], [course], [learner], [template]] = await Promise.all([
    database
      .select()
      .from(certificates)
      .where(
        and(
          eq(certificates.courseId, courseId),
          eq(certificates.userId, userId),
        ),
      )
      .limit(1),
    database
      .select({ title: courses.title, teacherId: courses.teacherId })
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1),
    database
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1),
    database
      .select()
      .from(certificateTemplates)
      .where(eq(certificateTemplates.courseId, courseId))
      .limit(1),
  ]);
  if (existing || !course || !learner) return existing ?? null;

  const serial = generateSerial("CERT");
  const issuedAt = new Date();
  const expiresAt = template?.validityDays
    ? new Date(issuedAt.getTime() + template.validityDays * 86_400_000)
    : null;
  const svg = renderCertificateSvg({
    title: template?.title ?? "Certificate of Completion",
    learnerName: learner.name,
    courseTitle: course.title,
    issuer: template?.issuer ?? "Modern E-Learning Portal",
    signerName: template?.signerName ?? null,
    accentColor: template?.accentColor ?? "#1677ff",
    serial,
    issuedAt,
    expiresAt,
  });

  const [certificate] = await database
    .insert(certificates)
    .values({
      serial,
      userId,
      courseId,
      templateId: template?.id ?? null,
      issuedAt,
      expiresAt,
      svg,
    })
    .onConflictDoNothing()
    .returning();
  if (!certificate) return null;

  const uid = generateSerial("BADGE");
  const [assertion] = await database
    .insert(badgeAssertions)
    .values({
      uid,
      userId,
      courseId,
      certificateId: certificate.id,
      name: `${course.title} — Completion Badge`,
      description: `Awarded to ${learner.name} for completing ${course.title}.`,
      issuedOn: issuedAt,
      expiresAt,
      evidenceUrl: `/certificate/${serial}`,
    })
    .onConflictDoNothing()
    .returning();
  return { certificate, badgeAssertion: assertion ?? null };
}
