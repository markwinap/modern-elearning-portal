"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

interface Props {
  courseId: number;
}

interface Grade {
  id: number;
  activityId: number;
  userId: string;
  rawScore: number | null;
  maxScore: number | null;
  percentage: number | null;
  feedback: string | null;
  gradedAt: Date | null;
}

interface GradeFormValues {
  activityId: number;
  userId: string;
  rawScore: number;
  maxScore: number;
  feedback: string;
}

export function GradebookView({ courseId }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [form] = Form.useForm<GradeFormValues>();
  const utils = api.useUtils();

  const { data: grades = [], isLoading } = api.gradebook.getCourseGrades.useQuery({ courseId });

  const submitGrade = api.gradebook.submitGrade.useMutation({
    onSuccess: () => {
      void utils.gradebook.getCourseGrades.invalidate({ courseId });
      setSubmitOpen(false);
      form.resetFields();
      messageApi.success("Grade submitted!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const columns: ColumnsType<Grade> = [
    {
      title: "User ID",
      dataIndex: "userId",
      key: "userId",
      width: 200,
      render: (id: string) => <Typography.Text code style={{ fontSize: 11 }}>{id.slice(0, 8)}…</Typography.Text>,
    },
    {
      title: "Activity ID",
      dataIndex: "activityId",
      key: "activityId",
      width: 100,
    },
    {
      title: "Score",
      key: "score",
      width: 160,
      render: (_: unknown, g: Grade) =>
        g.rawScore != null && g.maxScore != null ? (
          <Space>
            <Typography.Text strong>{g.rawScore} / {g.maxScore}</Typography.Text>
            <Progress
              percent={g.percentage ?? 0}
              size="small"
              style={{ width: 80, marginBottom: 0 }}
              format={(p) => `${p?.toFixed(0)}%`}
            />
          </Space>
        ) : "—",
    },
    {
      title: "Feedback",
      dataIndex: "feedback",
      key: "feedback",
      render: (fb: string | null) => fb ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Graded At",
      dataIndex: "gradedAt",
      key: "gradedAt",
      width: 140,
      render: (d: Date | null) => d ? new Date(d).toLocaleDateString() : "—",
    },
  ];

  return (
    <>
      {contextHolder}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Typography.Text type="secondary">{grades.length} grade{grades.length !== 1 ? "s" : ""} recorded</Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setSubmitOpen(true)}>
          Submit Grade
        </Button>
      </div>

      <Table
        dataSource={grades}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No grades submitted yet." }}
      />

      <Modal
        title="Submit Grade"
        open={submitOpen}
        onCancel={() => { setSubmitOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        confirmLoading={submitGrade.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(v) => submitGrade.mutate(v)}>
          <Form.Item name="activityId" label="Activity ID" rules={[{ required: true }]}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="userId" label="User ID" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="rawScore" label="Score" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="maxScore" label="Max Score" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="feedback" label="Feedback">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
