import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CourseInsightsView } from "./_components/course-insights-view";

export const metadata: Metadata = {
  title: "Course Insights | Modern E-Learning Portal",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CourseInsightsPage({ params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();

  return <CourseInsightsView courseId={courseId} />;
}
