"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  List,
  Progress,
  Space,
  Tag,
  Typography,
} from "antd";

import { PathProgress } from "~/components/paths/path-progress";
import { useTRPC } from "~/trpc/react";

export default function MyLearningPathsPage() {
  const trpc = useTRPC();
  const { data: availablePaths = [] } = useQuery(
    trpc.learningPath.list.queryOptions(),
  );
  const { data: myPaths = [], refetch } = useQuery(
    trpc.learningPath.myPaths.queryOptions(),
  );

  return (
    <main>
      <h1>My learning paths</h1>
      <Space orientation="vertical" size="large" style={{ width: "100%" }}>
        <Card title="Enrolled">
          <List
            dataSource={myPaths}
            renderItem={(path) => (
              <List.Item>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Typography.Text strong>{path.title}</Typography.Text>
                  <Progress percent={path.progressPct} />
                  {path.completedAt && <Tag color="green">Completed</Tag>}
                  <PathProgress pathId={path.id} />
                </Space>
              </List.Item>
            )}
          />
          {myPaths.length === 0 && (
            <Typography.Text type="secondary">
              Not enrolled in any paths yet.
            </Typography.Text>
          )}
        </Card>
        <Card title="Available">
          <List
            dataSource={availablePaths}
            renderItem={(path) => (
              <List.Item
                actions={[
                  <JoinButton
                    key="join"
                    pathId={path.id}
                    onJoined={() => void refetch()}
                  />,
                ]}
              >
                <Typography.Text strong>{path.title}</Typography.Text>
                <br />
                <Typography.Text type="secondary">
                  {path.description}
                </Typography.Text>
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </main>
  );
}

function JoinButton({
  pathId,
  onJoined,
}: {
  pathId: number;
  onJoined: () => void;
}) {
  const trpc = useTRPC();
  const { message } = App.useApp();
  const join = useMutation(
    trpc.learningPath.join.mutationOptions({
      onSuccess: () => {
        void message.success("Joined path");
        onJoined();
      },
      onError: (error) => void message.error(error.message),
    }),
  );
  return (
    <Button
      type="primary"
      loading={join.isPending}
      onClick={() => join.mutate({ pathId })}
    >
      Join
    </Button>
  );
}
