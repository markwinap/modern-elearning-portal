"use client";

import { Alert, Card, Space, Tag, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import Link from "next/link";

import { FileEditor } from "./file-editor";
import { PageEditor } from "./page-editor";
import { QuizEditor } from "./quiz-editor";
import { TextMediaEditor } from "./text-media-editor";
import { UrlEditor } from "./url-editor";

const TYPE_COLORS: Record<string, string> = {
  lesson: "blue",
  quiz: "red",
  page: "green",
  file: "orange",
  url: "cyan",
  text_media: "purple",
  wiki: "geekblue",
  workshop: "magenta",
};

interface Activity {
  id: number;
  type: string;
  title: string;
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
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
    showFeedback: boolean;
  } | null;
  textMediaContent: { content: string } | null;
  quizQuestions: Array<{
    id: number;
    type: string;
    prompt: string;
    options: unknown;
    correctAnswer: unknown;
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
  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="large">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href={`/teach/courses/${courseId}/sections`}>
          <ArrowLeftOutlined style={{ fontSize: 16 }} />
        </Link>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {activity.title}
        </Typography.Title>
        <Tag color={TYPE_COLORS[activity.type] ?? "default"}>{activity.type}</Tag>
      </div>

      {activity.type === "page" && (
        <PageEditor activityId={activity.id} initialContent={pageContent?.content ?? ""} />
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
