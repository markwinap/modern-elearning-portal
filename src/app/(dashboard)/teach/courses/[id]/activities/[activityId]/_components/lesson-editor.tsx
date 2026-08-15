"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";

import { useTRPC } from "~/trpc/react";
import {
  type LessonBranch,
  type LessonGraph,
  type LessonNode,
  EMPTY_LESSON_GRAPH,
} from "~/lib/activity-content";

interface Props {
  activityId: number;
  initialGraph: LessonGraph | null;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function LessonEditor({ activityId, initialGraph }: Props) {
  const trpc = useTRPC();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [graph, setGraph] = useState<LessonGraph>(
    initialGraph ?? EMPTY_LESSON_GRAPH,
  );

  const save = useMutation(
    trpc.lesson.saveGraph.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.lesson.getGraph.queryKey({ activityId }),
        });
        void messageApi.success("Lesson graph saved!");
      },
      onError: (err) => {
        void messageApi.error(err.message);
      },
    }),
  );

  const nodeOptions = useMemo(
    () => graph.nodes.map((n) => ({ label: n.title, value: n.id })),
    [graph.nodes],
  );

  function updateNode(id: string, patch: Partial<LessonNode>) {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));
  }

  function addNode() {
    const newNode: LessonNode = {
      id: generateId(),
      title: `Node ${graph.nodes.length + 1}`,
      content: "",
      branches: [],
    };
    setGraph((prev) => ({
      ...prev,
      startNodeId: prev.nodes.length === 0 ? newNode.id : prev.startNodeId,
      nodes: [...prev.nodes, newNode],
    }));
  }

  function removeNode(id: string) {
    setGraph((prev) => {
      const filtered = prev.nodes.filter((n) => n.id !== id);
      let startNodeId = prev.startNodeId;
      if (startNodeId === id && filtered.length > 0) {
        startNodeId = filtered[0]?.id ?? "";
      }
      // Remove branches that point to deleted node
      const cleaned = filtered.map((n) => ({
        ...n,
        branches: n.branches.filter((b) => b.targetNodeId !== id),
      }));
      return { ...prev, startNodeId, nodes: cleaned };
    });
  }

  function addBranch(nodeId: string) {
    const target = graph.nodes.find((n) => n.id !== nodeId)?.id;
    const branch: LessonBranch = {
      id: generateId(),
      label: "Continue",
      targetNodeId: target ?? nodeId,
    };
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, branches: [...n.branches, branch] } : n,
      ),
    }));
  }

  function updateBranch(
    nodeId: string,
    branchId: string,
    patch: Partial<LessonBranch>,
  ) {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              branches: n.branches.map((b) =>
                b.id === branchId ? { ...b, ...patch } : b,
              ),
            }
          : n,
      ),
    }));
  }

  function removeBranch(nodeId: string, branchId: string) {
    setGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, branches: n.branches.filter((b) => b.id !== branchId) }
          : n,
      ),
    }));
  }

  function setStartNode(id: string) {
    setGraph((prev) => ({ ...prev, startNodeId: id }));
  }

  function handleSave() {
    save.mutate({ activityId, graph });
  }

  return (
    <>
      {contextHolder}
      <Card
        title={<Typography.Text strong>Lesson Flow Editor</Typography.Text>}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={save.isPending}
            onClick={handleSave}
          >
            Save Graph
          </Button>
        }
      >
        <Space
          direction="vertical"
          style={{ width: "100%" }}
          size="large"
        >
          <Form.Item label="Start node">
            <Select
              value={graph.startNodeId}
              options={nodeOptions}
              onChange={setStartNode}
              style={{ width: 320 }}
            />
          </Form.Item>

          {graph.nodes.map((node, index) => (
            <Card
              key={node.id}
              size="small"
              title={`Node ${index + 1}: ${node.title}`}
              extra={
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeNode(node.id)}
                  disabled={graph.nodes.length <= 1}
                >
                  Delete
                </Button>
              }
            >
              <Space
                direction="vertical"
                style={{ width: "100%" }}
              >
                <Input
                  placeholder="Node title"
                  value={node.title}
                  onChange={(e) =>
                    updateNode(node.id, { title: e.target.value })
                  }
                />
                <Input.TextArea
                  rows={8}
                  placeholder="Node content (Markdown supported)"
                  value={node.content}
                  onChange={(e) =>
                    updateNode(node.id, { content: e.target.value })
                  }
                  style={{ fontFamily: "monospace" }}
                />

                <Typography.Text strong>Branches</Typography.Text>
                {node.branches.map((branch) => (
                  <Space key={branch.id} wrap>
                    <Input
                      placeholder="Button label"
                      value={branch.label}
                      onChange={(e) =>
                        updateBranch(node.id, branch.id, {
                          label: e.target.value,
                        })
                      }
                    />
                    <Select
                      placeholder="Target node"
                      value={branch.targetNodeId}
                      options={nodeOptions.filter((o) => o.value !== node.id)}
                      onChange={(value) =>
                        updateBranch(node.id, branch.id, {
                          targetNodeId: value,
                        })
                      }
                      style={{ width: 220 }}
                    />
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeBranch(node.id, branch.id)}
                    />
                  </Space>
                ))}
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addBranch(node.id)}
                >
                  Add branch
                </Button>
              </Space>
            </Card>
          ))}

          <Button icon={<PlusOutlined />} onClick={addNode}>
            Add node
          </Button>
        </Space>
      </Card>
    </>
  );
}
