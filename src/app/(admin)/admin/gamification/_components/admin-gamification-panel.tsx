"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Typography,
  theme,
} from "antd";
import { useState } from "react";

import type { GamificationRules } from "~/lib/gamification-rules";
import { PageHeader } from "~/components/ui/page-header";
import { useTRPC } from "~/trpc/react";

interface AdminGamificationFormValues {
  activityCompletedPoints: number;
  quizPassedPoints: number;
  courseCompletedPoints: number;
  dailyLoginPoints: number;
  levelThresholds: string;
}

interface Props {
  initialConfig: GamificationRules;
}

function thresholdsToString(thresholds: number[]): string {
  return thresholds.join(", ");
}

function parseThresholds(value: string): number[] | null {
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const nums = parts.map((s) => Number(s));
  if (nums.some(Number.isNaN)) return null;
  return nums;
}

export function AdminGamificationPanel({ initialConfig }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { token } = theme.useToken();
  const [form] = Form.useForm<AdminGamificationFormValues>();
  const [error, setError] = useState<string | null>(null);

  const updateConfig = useMutation(
    trpc.gamification.updateConfig.mutationOptions({
      onSuccess: async () => {
        setError(null);
        await queryClient.invalidateQueries({
          queryKey: trpc.gamification.getConfig.queryKey(),
        });
      },
      onError: (err) => setError(err.message),
    }),
  );

  const refreshLeaderboard = useMutation(
    trpc.gamification.refreshLeaderboard.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.gamification.getLeaderboard.queryKey({
            scope: "global",
          }),
        });
      },
      onError: (err) => setError(err.message),
    }),
  );

  function handleSave(values: AdminGamificationFormValues) {
    const thresholds = parseThresholds(values.levelThresholds);
    if (!thresholds || thresholds.length === 0) {
      setError("Level thresholds must be a comma-separated list of numbers.");
      return;
    }

    updateConfig.mutate({
      activityCompletedPoints: values.activityCompletedPoints,
      quizPassedPoints: values.quizPassedPoints,
      courseCompletedPoints: values.courseCompletedPoints,
      dailyLoginPoints: values.dailyLoginPoints,
      levelThresholds: thresholds,
    });
  }

  return (
    <div>
      <PageHeader
        title="Gamification"
        subtitle="Configure point values, level thresholds, and refresh leaderboards."
        marginBottom={24}
      />

      {error ? (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ...initialConfig,
          levelThresholds: thresholdsToString(initialConfig.levelThresholds),
        }}
        onFinish={handleSave}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Point Values" variant="outlined">
              <Space direction="vertical" style={{ display: "flex" }}>
                <Form.Item
                  label="Activity Completed"
                  name="activityCompletedPoints"
                  rules={[
                    {
                      required: true,
                      message: "Activity points are required",
                    },
                  ]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  label="Quiz Passed"
                  name="quizPassedPoints"
                  rules={[
                    { required: true, message: "Quiz points are required" },
                  ]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  label="Course Completed"
                  name="courseCompletedPoints"
                  rules={[
                    { required: true, message: "Course points are required" },
                  ]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  label="Daily Login"
                  name="dailyLoginPoints"
                  rules={[
                    {
                      required: true,
                      message: "Daily login points are required",
                    },
                  ]}
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Level Thresholds" variant="outlined">
              <Form.Item
                label="Thresholds (comma-separated)"
                name="levelThresholds"
                rules={[
                  {
                    required: true,
                    message: "Level thresholds are required",
                  },
                ]}
              >
                <Input.TextArea
                  rows={3}
                  placeholder="0, 100, 250, 500"
                />
              </Form.Item>
              <Typography.Text type="secondary" style={{ color: token.colorTextSecondary }}>
                Enter cumulative point thresholds for each level. The first
                value should usually be 0.
              </Typography.Text>
            </Card>
          </Col>
        </Row>

        <Space style={{ marginTop: 16 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={updateConfig.isPending}
          >
            Save Changes
          </Button>
          <Button
            onClick={() =>
              refreshLeaderboard.mutate({ scope: "global" })
            }
            loading={refreshLeaderboard.isPending}
          >
            Refresh Global Leaderboard
          </Button>
        </Space>
      </Form>
    </div>
  );
}
