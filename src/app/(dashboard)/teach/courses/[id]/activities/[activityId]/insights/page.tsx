import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuestionInsightsView } from "./_components/question-insights-view";

export const metadata: Metadata = {
  title: "Question Insights | Modern E-Learning Portal",
};

interface Props {
  params: Promise<{ id: string; activityId: string }>;
}

export default async function QuestionInsightsPage({ params }: Props) {
  const { id, activityId } = await params;
  const courseId = parseInt(id, 10);
  const actId = parseInt(activityId, 10);
  if (isNaN(courseId) || isNaN(actId)) notFound();

  return <QuestionInsightsView activityId={actId} />;
}
