"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { Alert, Card, Select, Space, Switch, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";

import { ActivityBadge } from "~/components/ui/activity-badge";
import { FileEditor } from "./file-editor";
import { PageEditor } from "./page-editor";
import { QuizEditor } from "./quiz-editor";
import { TextMediaEditor } from "./text-media-editor";
import { UrlEditor } from "./url-editor";

interface Activity {
  id: number;
  type: string;
  title: string;
  gradable: boolean;
  gradeCategoryId: number | null;
}

interface Props {
  activity: Activity;
  courseId: number;
  pageContent: { content: string } | null;
  fileContent: {
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    forceDownload: boolean;
  } | null;
  urlContent: {
    url: string;
    label: string | null;
    description: string | null;
    openMode: string;
  } | null;
  quizSettings: {
    timeLimitSecs: number | null;
    maxAttempts: number;
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
  textMediaContent: { content: string } | null;
  quizQuestions: Array<{
    id: number;
    type: string;
    prompt: string;
    options: unknown;
    correctAnswer: unknown;
    allowMultiple: boolean;
    points: number;
    order: number;
  }> | null;
}

export function ActivityEditor({
  activity,
  courseId,
  pageContent,
  fileContent,
  urlContent,
  textMediaContent,
  quizSettings,
  quizQuestions,
}: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery(
    trpc.gradebook.listCategories.queryOptions({
      courseId,
    }),
  );
  const updateActivity = useMutation(
    trpc.activity.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.activity.getById.queryKey({ id: activity.id }),
        });
      },
    }),
  );

  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="large">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href={`/teach/courses/${courseId}/sections`}>
          <ArrowLeftOutlined style={{ fontSize: 16 }} />
        </Link>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {activity.title}
        </Typography.Title>
        <ActivityBadge type={activity.type} />
      </div>

      <Card title="Grading Settings" size="small">
        <Space orientation="vertical" style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Switch
              checked={activity.gradable}
              checkedChildren="Gradable"
              unCheckedChildren="Not gradable"
              onChange={(checked) =>
                updateActivity.mutate({ id: activity.id, gradable: checked })
              }
            />
            <Typography.Text>Gradable</Typography.Text>
          </div>
          <Select
            placeholder="Grade category (optional)"
            allowClear
            style={{ width: 280 }}
            value={activity.gradeCategoryId}
            options={categories.map(
              (cat: { id: number; name: string; weight: number }) => ({
                value: cat.id,
                label: `${cat.name} (${cat.weight}%)`,
              }),
            )}
            onChange={(value) =>
              updateActivity.mutate({
                id: activity.id,
                gradeCategoryId: value ?? null,
              })
            }
          />
        </Space>
      </Card>

      {activity.type === "page" && (
        <PageEditor
          activityId={activity.id}
          initialContent={pageContent?.content ?? ""}
        />
      )}

      {activity.type === "file" && (
        <FileEditor activityId={activity.id} initialData={fileContent} />
      )}

      {activity.type === "url" && (
        <UrlEditor activityId={activity.id} initialData={urlContent} />
      )}

      {activity.type === "quiz" && (
        <QuizEditor
          activityId={activity.id}
          initialSettings={quizSettings}
          initialQuestions={quizQuestions ?? []}
        />
      )}

      {activity.type === "text_media" && (
        <TextMediaEditor
          activityId={activity.id}
          initialContent={textMediaContent?.content ?? ""}
        />
      )}

      {(activity.type === "lesson" ||
        activity.type === "wiki" ||
        activity.type === "workshop") && (
        <Card>
          <Alert
            type="info"
            showIcon
            title={`${activity.type.replace("_", " ")} editor`}
            description="A dedicated editor for this activity type is coming soon."
          />
        </Card>
      )}
    </Space>
  );
}
