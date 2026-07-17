export const COURSE_STATUS_COLORS = {
  draft: "default",
  published: "success",
  archived: "warning",
} as const;

export type CourseStatus = keyof typeof COURSE_STATUS_COLORS;

export function getStatusColor(status: string): string {
  return (
    COURSE_STATUS_COLORS[status as CourseStatus] ??
    (COURSE_STATUS_COLORS as Record<string, string>)[status] ??
    "default"
  );
}

export function isCourseStatus(status: string): status is CourseStatus {
  return status in COURSE_STATUS_COLORS;
}
