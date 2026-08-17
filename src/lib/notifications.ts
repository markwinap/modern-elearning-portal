import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "announcement_posted",
  "course_enrollment",
  "enrollment_request",
  "enrollment_approved",
  "enrollment_rejected",
  "enrollment_status_changed",
  "grade_posted",
  "discussion_message",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export interface NotificationTemplate {
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function notificationToTemplate(
  type: NotificationType,
  payload: Record<string, unknown>,
): NotificationTemplate {
  const courseSlug = getString(payload.courseSlug);
  const courseTitle = getString(payload.courseTitle) ?? "this course";

  switch (type) {
    case "announcement_posted": {
      const title = getString(payload.title) ?? "New announcement";
      return {
        title,
        body: `A new announcement was posted in ${courseTitle}.`,
        href: courseSlug ? `/courses/${courseSlug}` : undefined,
        hrefLabel: "Open course",
      };
    }

    case "course_enrollment": {
      const courseId = getNumber(payload.courseId);
      return {
        title: "New student enrollment",
        body: `A student enrolled in ${courseTitle}.`,
        href:
          courseId !== undefined
            ? `/teach/courses/${courseId}/students`
            : "/teach",
        hrefLabel: "View students",
      };
    }

    case "enrollment_request": {
      const courseId = getNumber(payload.courseId);
      return {
        title: "New enrollment request",
        body: `A student requested enrollment in ${courseTitle}.`,
        href:
          courseId !== undefined
            ? `/teach/courses/${courseId}/enrollments`
            : "/teach",
        hrefLabel: "Review request",
      };
    }

    case "enrollment_approved":
      return {
        title: "Enrollment approved",
        body: `Your enrollment request for ${courseTitle} was approved.`,
        href: courseSlug ? `/courses/${courseSlug}/learn` : undefined,
        hrefLabel: "Start learning",
      };

    case "enrollment_rejected": {
      const reason = getString(payload.rejectionReason);
      return {
        title: "Enrollment declined",
        body: reason
          ? `Your enrollment request for ${courseTitle} was declined. Reason: ${reason}`
          : `Your enrollment request for ${courseTitle} was declined.`,
        href: courseSlug ? `/courses/${courseSlug}` : undefined,
        hrefLabel: "View course",
      };
    }

    case "enrollment_status_changed": {
      const newStatus = getString(payload.newStatus) ?? "updated";
      return {
        title: "Enrollment status changed",
        body: `Your enrollment status is now ${newStatus} for ${courseTitle}.`,
        href: courseSlug ? `/courses/${courseSlug}` : undefined,
        hrefLabel: "Open course",
      };
    }

    case "grade_posted": {
      const rawScore = getNumber(payload.rawScore);
      const maxScore = getNumber(payload.maxScore);
      const scoreLabel =
        rawScore !== undefined && maxScore !== undefined
          ? `Score: ${rawScore}/${maxScore}.`
          : "A new grade is available.";
      return {
        title: "Grade posted",
        body: `${scoreLabel} ${courseTitle}`,
        href: "/grades",
        hrefLabel: "My Grades",
      };
    }

    case "discussion_message": {
      const subject = getString(payload.subject) ?? "Discussion thread";
      const threadId = getNumber(payload.threadId);
      return {
        title: "New discussion message",
        body: `New reply in "${subject}" for ${courseTitle}.`,
        href:
          courseSlug && threadId !== undefined
            ? `/courses/${courseSlug}/discussions?threadId=${threadId}`
            : undefined,
        hrefLabel: "View thread",
      };
    }
  }
}
