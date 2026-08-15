"use client";

import { useState } from "react";
import { Button, Card, Empty, Space, Typography } from "antd";

import { MarkdownPreview } from "~/components/ui/markdown-preview";
import { type LessonGraph } from "~/lib/activity-content";

interface Props {
  graph: LessonGraph | null;
  isCompleted: boolean;
  onComplete: () => void;
}

export function LessonViewer({ graph, isCompleted, onComplete }: Props) {
  const [currentNodeId, setCurrentNodeId] = useState(graph?.startNodeId ?? "");

  if (!graph?.nodes.length) {
    return (
      <Card>
        <Empty description="No lesson content yet." />
      </Card>
    );
  }

  const currentNode = graph.nodes.find((n) => n.id === currentNodeId);
  if (!currentNode) {
    return (
      <Card>
        <Empty description="Lesson start node not found." />
      </Card>
    );
  }

  const isTerminal = currentNode.branches.length === 0;

  return (
    <Card>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Typography.Title level={4}>{currentNode.title}</Typography.Title>
        <MarkdownPreview source={currentNode.content} />

        {currentNode.branches.length > 0 && (
          <Space wrap>
            {currentNode.branches.map((branch) => (
              <Button
                key={branch.id}
                type="primary"
                onClick={() => setCurrentNodeId(branch.targetNodeId)}
              >
                {branch.label}
              </Button>
            ))}
          </Space>
        )}

        {isTerminal && (
          <Button type="primary" disabled={isCompleted} onClick={onComplete}>
            {isCompleted ? "Completed" : "Mark lesson complete"}
          </Button>
        )}
      </Space>
    </Card>
  );
}
