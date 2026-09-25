"use client";

import { useQuery } from "@tanstack/react-query";
import { List, Progress, Tag, Typography } from "antd";
import Link from "next/link";

import { useTRPC } from "~/trpc/react";

interface Props {
  pathId: number;
}

export function PathProgress({ pathId }: Props) {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.learningPath.myProgress.queryOptions({ pathId }));
  const total = data?.totalPct ?? 0;

  return (
    <div>
      <Typography.Title level={3}>Path progress</Typography.Title>
      <Progress percent={total} status={total >= 100 ? "success" : "active"} />
      <List
        dataSource={data?.steps ?? []}
        renderItem={(step) => (
          <List.Item>
            <Typography.Text>
              {step.order + 1}. {" "}
              {step.isLocked ? (
                <span>{step.title}</span>
              ) : (
                <Link href={`/courses/${step.slug}`}>{step.title}</Link>
              )}
            </Typography.Text>
            <div>
              {step.isLocked ? <Tag>Locked</Tag> : null}
              {step.isCompleted ? <Tag color="green">Completed</Tag> : null}
              {!step.isCompleted && !step.isLocked ? (
                <Tag color="blue">{step.progressPct}%</Tag>
              ) : null}
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}
