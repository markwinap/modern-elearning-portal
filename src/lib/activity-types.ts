export const ACTIVITY_TYPES = [
  { value: "lesson", label: "Lesson" },
  { value: "quiz", label: "Quiz" },
  { value: "page", label: "Page" },
  { value: "file", label: "File" },
  { value: "url", label: "URL" },
  { value: "text_media", label: "Text & Media" },
  { value: "wiki", label: "Wiki" },
  { value: "workshop", label: "Workshop" },
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number]["value"];

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  lesson: "blue",
  quiz: "red",
  page: "green",
  file: "orange",
  url: "cyan",
  text_media: "purple",
  wiki: "geekblue",
  workshop: "magenta",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> =
  Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.value, t.label])) as Record<
    ActivityType,
    string
  >;

export function getActivityTypeColor(type: string): string {
  return ACTIVITY_TYPE_COLORS[type as ActivityType] ?? "default";
}

export function getActivityTypeLabel(type: string): string | undefined {
  return ACTIVITY_TYPE_LABELS[type as ActivityType];
}

export function isActivityType(type: string): type is ActivityType {
  return ACTIVITY_TYPE_LABELS[type as ActivityType] !== undefined;
}
