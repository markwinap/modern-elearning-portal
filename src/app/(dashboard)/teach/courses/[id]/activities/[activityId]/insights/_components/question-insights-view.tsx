"use client";

import { Card, Col, Row, Space, Statistic, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import { api } from "~/trpc/react";

interface Props {
  activityId: number;
}

interface QuestionInsight {
  questionId: number;
  prompt: string;
  type: string;
  points: number;
  attempts: number;
  averageScore: number;
  medianScore: number;
  averageTimeSecs: number;
  medianTimeSecs: number;
  difficulty: number;
  discrimination: number;
}

function formatTime(secs: number): string {
  if (secs <= 0) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function difficultyTag(d: number) {
  if (d >= 0.8) return <Tag color="green">Easy</Tag>;
  if (d >= 0.4) return <Tag color="blue">Medium</Tag>;
  return <Tag color="red">Hard</Tag>;
}

function discriminationTag(d: number) {
  if (d >= 0.3) return <Tag color="green">Good</Tag>;
  if (d >= 0.15) return <Tag color="orange">Fair</Tag>;
  return <Tag color="red">Poor</Tag>;
}

export function QuestionInsightsView({ activityId }: Props) {
  const { data: questionInsights = [], isLoading: questionsLoading } =
    api.quiz.getQuestionInsights.useQuery({ activityId });
  const { data: testInsights, isLoading: testLoading } =
    api.quiz.getTestInsights.useQuery({ activityId });

  const columns: ColumnsType<QuestionInsight> = [
    {
      title: "#",
      dataIndex: "questionId",
      width: 50,
      render: (_, __, idx) => idx + 1,
    },
    {
      title: "Question",
      dataIndex: "prompt",
      ellipsis: true,
      width: 250,
    },
    {
      title: "Type",
      dataIndex: "type",
      width: 120,
      render: (v: string) => <Tag>{v.replace("_", " ")}</Tag>,
    },
    {
      title: "Attempts",
      dataIndex: "attempts",
      width: 90,
      sorter: (a, b) => a.attempts - b.attempts,
    },
    {
      title: "Avg Score %",
      dataIndex: "averageScore",
      width: 110,
      render: (v: number) => `${v.toFixed(1)}%`,
      sorter: (a, b) => a.averageScore - b.averageScore,
    },
    {
      title: "Median Time",
      dataIndex: "medianTimeSecs",
      width: 110,
      render: (v: number) => formatTime(v),
      sorter: (a, b) => a.medianTimeSecs - b.medianTimeSecs,
    },
    {
      title: "Difficulty",
      dataIndex: "difficulty",
      width: 100,
      render: (v: number) => difficultyTag(v),
      sorter: (a, b) => a.difficulty - b.difficulty,
    },
    {
      title: "Discrimination",
      dataIndex: "discrimination",
      width: 120,
      render: (v: number) => discriminationTag(v),
      sorter: (a, b) => a.discrimination - b.discrimination,
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={4}>Quiz Insights</Typography.Title>

      {/* Test-level summary */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Attempts"
              value={testInsights?.attempts ?? 0}
              loading={testLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Questions"
              value={testInsights?.questionCount ?? 0}
              loading={testLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Score"
              value={testInsights?.averageScore?.toFixed(1) ?? "—"}
              suffix="%"
              loading={testLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Avg Time"
              value={testInsights?.averageTime ?? "—"}
              loading={testLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* Question-level table */}
      <Card title="Per-Question Insights">
        <Table<QuestionInsight>
          dataSource={questionInsights}
          columns={columns}
          rowKey="questionId"
          loading={questionsLoading}
          pagination={false}
          size="small"
          scroll={{ x: 950 }}
        />
      </Card>
    </Space>
  );
}
