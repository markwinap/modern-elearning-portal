"use client";

import { Button, Card, Progress, Typography } from "antd";
import { PlayCircleOutlined } from "@ant-design/icons";
import Link from "next/link";

import { gradientFromTitle } from "~/lib/gradient";

interface Props {
  courseId: number;
  title: string;
  slug: string | null;
  coverImageUrl: string | null;
  progressPct: number;
}

export function CourseProgressCard({
  title,
  slug,
  coverImageUrl,
  progressPct,
}: Props) {
  const href = slug ? `/courses/${slug}/learn` : "#";

  return (
    <Card
      cover={
        <div
          style={{
            height: 120,
            background: coverImageUrl
              ? `url(${coverImageUrl}) center/cover`
              : gradientFromTitle(title),
          }}
          role="img"
          aria-label={title}
        />
      }
      bodyStyle={{ padding: 16 }}
    >
      <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
        {title}
      </Typography.Text>
      <Progress percent={progressPct} size="small" aria-label={`${title} ${progressPct}% complete`} />
      <Link href={href} passHref legacyBehavior>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          block
          style={{ marginTop: 12 }}
          aria-label={`Continue ${title}`}
        >
          Continue
        </Button>
      </Link>
    </Card>
  );
}
