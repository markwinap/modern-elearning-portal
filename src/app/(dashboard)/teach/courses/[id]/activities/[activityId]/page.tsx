import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { ActivityEditor } from "./_components/activity-editor";

export const metadata: Metadata = { title: "Edit Activity | EduCore" };

interface Props {
  params: Promise<{ id: string; activityId: string }>;
}

export default async function ActivityEditorPage({ params }: Props) {
  const { id, activityId } = await params;
  const courseId = parseInt(id, 10);
  const actId = parseInt(activityId, 10);
  if (isNaN(courseId) || isNaN(actId)) notFound();

  let activity;
  try {
    activity = await api.activity.getById({ id: actId });
  } catch {
    notFound();
  }

  let pageContent: { content: string } | null = null;
  let fileContent: {
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    forceDownload: boolean;
  } | null = null;
  let urlContent: {
    url: string;
    label: string | null;
    description: string | null;
    openMode: string;
  } | null = null;
  let quizSettings: {
    timeLimitSecs: number | null;
    maxAttempts: number;
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
    showFeedback: boolean;
  } | null = null;
  let quizQuestions: Array<{
    id: number;
    type: string;
    prompt: string;
    options: unknown;
    correctAnswer: unknown;
    points: number;
    order: number;
  }> | null = null;
  let textMediaContent: { content: string } | null = null;

  if (activity.type === "page") {
    pageContent = await api.page.getByActivity({ activityId: actId });
  } else if (activity.type === "file") {
    fileContent = await api.file.getByActivity({ activityId: actId });
  } else if (activity.type === "url") {
    urlContent = await api.url.getByActivity({ activityId: actId });
  } else if (activity.type === "quiz") {
    const [settings, questions] = await Promise.all([
      api.quiz.getQuiz({ activityId: actId }),
      api.quiz.listQuestions({ activityId: actId }),
    ]);
    quizSettings = settings;
    quizQuestions = questions;
  } else if (activity.type === "text_media") {
    textMediaContent = await api.textMedia.getByActivity({ activityId: actId });
  }

  return (
    <ActivityEditor
      activity={activity}
      courseId={courseId}
      pageContent={pageContent}
      fileContent={fileContent}
      urlContent={urlContent}
      quizSettings={quizSettings}
      quizQuestions={quizQuestions}
      textMediaContent={textMediaContent}
    />
  );
}
