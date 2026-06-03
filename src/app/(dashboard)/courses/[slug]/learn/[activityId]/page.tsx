import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { ActivityDispatcher } from "./_components/activity-dispatcher";

interface Props {
  params: Promise<{ slug: string; activityId: string }>;
}

export default async function ActivityPage({ params }: Props) {
  const { activityId } = await params;
  const id = parseInt(activityId, 10);
  if (isNaN(id)) notFound();

  let activity;
  try {
    activity = await api.activity.getById({ id });
  } catch {
    notFound();
  }

  const progress = await api.progress.getActivityProgress({ activityId: id });

  // Fetch type-specific content
  let pageContent: { content: string } | null = null;
  let fileContent: {
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    forceDownload: boolean;
  } | null = null;
  let quizContent: {
    quiz: {
      timeLimitSecs: number | null;
      maxAttempts: number | null;
      shuffleQuestions: boolean;
      shuffleAnswers: boolean;
      showFeedback: boolean;
    } | null;
    questions: Array<{
      id: number;
      type: string;
      prompt: string;
      options: unknown;
      points: number;
      order: number;
    }>;
  } | null = null;
  let textMediaContent: { content: string } | null = null;

  if (activity.type === "page") {
    pageContent = await api.page.getByActivity({ activityId: id });
  } else if (activity.type === "file") {
    fileContent = await api.file.getByActivity({ activityId: id });
  } else if (activity.type === "quiz") {
    const [quiz, questions] = await Promise.all([
      api.quiz.getQuiz({ activityId: id }),
      api.quiz.listQuestions({ activityId: id }),
    ]);
    quizContent = { quiz, questions };
  } else if (activity.type === "text_media") {
    textMediaContent = await api.textMedia.getByActivity({ activityId: id });
  }

  return (
    <ActivityDispatcher
      activity={activity}
      pageContent={pageContent}
      fileContent={fileContent}
      quizContent={quizContent}
      textMediaContent={textMediaContent}
      initialProgress={progress}
    />
  );
}
