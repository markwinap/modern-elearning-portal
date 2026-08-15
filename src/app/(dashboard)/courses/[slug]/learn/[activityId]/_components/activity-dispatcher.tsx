"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC, type RouterOutputs } from "~/trpc/react";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Space, Tag, Typography, message } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

import { type LessonGraph } from "~/lib/activity-content";
import { FileViewer } from "./file-viewer";
import { LessonViewer } from "./lesson-viewer";
import { PageViewer } from "./page-viewer";
import { QuizTaker } from "./quiz-taker";
import { TextMediaViewer } from "./text-media-viewer";
import { WikiViewer } from "./wiki-viewer";
import { WorkshopViewer } from "./workshop-viewer";

interface Activity {
  id: number;
  type: string;
  title: string;
  completionType: string;
  completionGrade: number | null;
  completionTimeSecs: number | null;
}

interface Props {
  activity: Activity;
  pageContent: { content: string } | null;
  fileContent: {
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    forceDownload: boolean;
  } | null;
  quizContent: {
    quiz: {
      timeLimitSecs: number | null;
      maxAttempts: number | null;
      questionsPerAttempt: number | null;
      oneQuestionAtATime: boolean;
      shuffleQuestions: boolean;
      shuffleAnswers: boolean;
      showFeedback: boolean;
      feedbackMode:
        | "immediate"
        | "after_last_attempt"
        | "after_due_date"
        | "never";
      availableUntil: Date | null;
    } | null;
    questions: Array<{
      id: number;
      type: string;
      prompt: string;
      options: unknown;
      allowMultiple: boolean;
      points: number;
      order: number;
    }>;
  } | null;
  textMediaContent: { content: string } | null;
  lessonGraph: LessonGraph | null;
  initialProgress: { status: string; completedAt: Date | null } | null;
}

export function ActivityDispatcher({
  activity,
  pageContent,
  fileContent,
  quizContent,
  textMediaContent,
  lessonGraph,
  initialProgress,
}: Props) {
  const trpc = useTRPC();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const [completed, setCompleted] = useState(
    initialProgress?.status === "completed",
  );

  const startTimeRef = useRef(Date.now());
  const [elapsedSecs, setElapsedSecs] = useState(0);

  // Track how long the student spends in this activity.
  useEffect(() => {
    startTimeRef.current = Date.now();
    setElapsedSecs(0);
    const interval = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activity.id]);

  const progressQueryKey = trpc.progress.getActivityProgress.queryKey({
    activityId: activity.id,
  });

  type ProgressSnapshot = RouterOutputs["progress"]["getActivityProgress"];

  const markActivity = useMutation(
    trpc.progress.markActivity.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: progressQueryKey });
        const previous =
          queryClient.getQueryData<ProgressSnapshot>(progressQueryKey);
        queryClient.setQueryData<ProgressSnapshot>(progressQueryKey, (old) =>
          old
            ? {
                ...old,
                status: input.status,
                completedAt:
                  input.status === "completed" ? new Date() : old.completedAt,
                timeSpentSecs:
                  (old.timeSpentSecs ?? 0) + (input.timeSpentSecs ?? 0),
              }
            : old,
        );
        if (input.status === "completed") setCompleted(true);
        return { previous };
      },
      onError: (err, input, context) => {
        if (context?.previous) {
          queryClient.setQueryData(progressQueryKey, context.previous);
        }
        if (input.status === "completed") setCompleted(false);
        messageApi.error(err.message);
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: progressQueryKey });
      },
    }),
  );

  const isCompleted = completed;

  // Auto-mark as in_progress when first viewed
  useEffect(() => {
    if (!initialProgress || initialProgress.status === "not_started") {
      markActivity.mutate({
        activityId: activity.id,
        status: "in_progress",
        timeSpentSecs: 0,
      });
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  function handleMarkComplete() {
    markActivity.mutate({
      activityId: activity.id,
      status: "completed",
      timeSpentSecs: elapsedSecs,
    });
  }

  const canMarkManually = useMemo(() => {
    if (
      isCompleted ||
      activity.type === "quiz" ||
      activity.type === "lesson" ||
      activity.type === "workshop"
    )
      return false;
    return (
      activity.completionType === "view" ||
      activity.completionType === "submit" ||
      activity.completionType === "time" ||
      activity.completionType === "grade"
    );
  }, [isCompleted, activity]);

  return (
    <>
      {contextHolder}
      <Space orientation="vertical" style={{ width: "100%" }} size="large">
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Typography.Title level={3} style={{ margin: 0 }}>
            {activity.title}
          </Typography.Title>
          <Space>
            {isCompleted ? (
              <Tag icon={<CheckCircleOutlined />} color="success">
                Completed
              </Tag>
            ) : canMarkManually ? (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={markActivity.isPending}
                disabled={
                  activity.completionType === "time" &&
                  elapsedSecs < (activity.completionTimeSecs ?? 0)
                }
                onClick={handleMarkComplete}
              >
                Mark Complete
              </Button>
            ) : null}
          </Space>
        </div>

        {/* Content dispatcher */}
        {activity.type === "page" && (
          <PageViewer content={pageContent?.content ?? null} />
        )}

        {activity.type === "file" && (
          <FileViewer file={fileContent} activityTitle={activity.title} />
        )}

        {activity.type === "quiz" && quizContent && (
          <QuizTaker
            activityId={activity.id}
            quiz={quizContent.quiz}
            questions={quizContent.questions}
            initialProgress={initialProgress}
            completionType={activity.completionType}
            completionGrade={activity.completionGrade}
            onComplete={() =>
              markActivity.mutate(
                {
                  activityId: activity.id,
                  status: "completed",
                  timeSpentSecs: elapsedSecs,
                },
                {
                  onSuccess: () => {
                    setCompleted(true);
                    void messageApi.success("Marked as complete!");
                  },
                },
              )
            }
          />
        )}

        {activity.type === "lesson" && (
          <LessonViewer
            graph={lessonGraph}
            isCompleted={isCompleted}
            onComplete={handleMarkComplete}
          />
        )}

        {activity.type === "text_media" && (
          <TextMediaViewer content={textMediaContent?.content ?? null} />
        )}

        {activity.type === "url" && (
          <Card>
            <Typography.Text type="secondary">
              URL resource — no URL configured.
            </Typography.Text>
          </Card>
        )}

        {activity.type === "wiki" && <WikiViewer activityId={activity.id} />}

        {activity.type === "workshop" && (
          <WorkshopViewer
            activityId={activity.id}
            isCompleted={isCompleted}
            onComplete={handleMarkComplete}
          />
        )}
      </Space>
    </>
  );
}
