"use client";

import { useEffect } from "react";
import { Alert, Button, Card, Space, Tag, Typography, message } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

import { FileViewer } from "./file-viewer";
import { PageViewer } from "./page-viewer";
import { QuizTaker } from "./quiz-taker";
import { TextMediaViewer } from "./text-media-viewer";

interface Activity {
  id: number;
  type: string;
  title: string;
  completionType: string;
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
  } | null;
  textMediaContent: { content: string } | null;
  initialProgress: { status: string; completedAt: Date | null } | null;
}

export function ActivityDispatcher({
  activity,
  pageContent,
  fileContent,
  quizContent,
  textMediaContent,
  initialProgress,
}: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const utils = api.useUtils();

  const markActivity = api.progress.markActivity.useMutation({
    onSuccess: () => utils.progress.getActivityProgress.invalidate(),
    onError: (err) => messageApi.error(err.message),
  });

  const isCompleted = initialProgress?.status === "completed";

  // Auto-mark as in_progress when first viewed
  useEffect(() => {
    if (!initialProgress || initialProgress.status === "not_started") {
      markActivity.mutate({ activityId: activity.id, status: "in_progress" });
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id]);

  function handleMarkComplete() {
    markActivity.mutate(
      { activityId: activity.id, status: "completed" },
      { onSuccess: () => void messageApi.success("Marked as complete!") },
    );
  }

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
            ) : (
              activity.completionType === "view" && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={markActivity.isPending}
                  onClick={handleMarkComplete}
                >
                  Mark Complete
                </Button>
              )
            )}
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
            onComplete={() =>
              markActivity.mutate({
                activityId: activity.id,
                status: "completed",
              })
            }
          />
        )}

        {activity.type === "lesson" && (
          <Card>
            <Alert
              type="info"
              message="Interactive lesson"
              description="This lesson contains an interactive flow diagram. The full lesson editor and viewer will be available in the teacher experience phase."
              showIcon
            />
          </Card>
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

        {activity.type === "wiki" && (
          <Card>
            <Typography.Text type="secondary">
              Wiki activity viewer coming in Phase 5.
            </Typography.Text>
          </Card>
        )}

        {activity.type === "workshop" && (
          <Card>
            <Typography.Text type="secondary">
              Workshop activity viewer coming in Phase 5.
            </Typography.Text>
          </Card>
        )}
      </Space>
    </>
  );
}
