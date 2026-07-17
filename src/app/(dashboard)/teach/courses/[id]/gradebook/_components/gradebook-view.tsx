"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";

import { api, type RouterOutputs } from "~/trpc/react";

import { CategoryManager } from "./category-manager";

interface Props {
  courseId: number;
}

interface GradeFormValues {
  sectionId: number | null;
  activityId: number | null;
  userId: string;
  rawScore: number | null;
  maxScore: number | null;
  feedback: string;
  gradeCategoryId: number | null;
}

export function GradebookView({ courseId }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [form] = Form.useForm<GradeFormValues>();
  const selectedSectionId = Form.useWatch("sectionId", form);
  const utils = api.useUtils();

  const { data, isLoading } = api.gradebook.getCourseGradeSummary.useQuery({
    courseId,
  });
  type Summary = RouterOutputs["gradebook"]["getCourseGradeSummary"];
  const emptySummary: Summary = {
    students: [],
    categories: [],
    activities: [],
  };
  const summary = data ?? emptySummary;

  const submitGrade = api.gradebook.submitGrade.useMutation({
    onSuccess: () => {
      void utils.gradebook.getCourseGradeSummary.invalidate({ courseId });
      setSubmitOpen(false);
      form.resetFields();
      messageApi.success("Grade submitted!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  type Student = (typeof summary)["students"][number];
  type GradeEntry = Student["grades"][number];

  const { students, categories, activities } = summary;

  const activityMap = useMemo(() => {
    return new Map(activities.map((a) => [a.id, a] as const));
  }, [activities]);

  const sections = useMemo(() => {
    const map = new Map<number, { id: number; title: string }>();
    for (const a of activities) {
      if (!map.has(a.sectionId)) {
        map.set(a.sectionId, { id: a.sectionId, title: a.sectionTitle });
      }
    }
    return Array.from(map.values());
  }, [activities]);

  const dataSource = useMemo(() => {
    return students.map((student) => {
      const gradeByActivity = new Map<number, GradeEntry>();
      for (const grade of student.grades) {
        gradeByActivity.set(grade.activityId, grade);
      }
      return { ...student, gradeByActivity };
    });
  }, [students]);

  type StudentRow = Student & { gradeByActivity: Map<number, GradeEntry> };

  const GradeCell = ({
    grade,
    onClick,
  }: {
    grade?: GradeEntry;
    onClick: () => void;
  }) => (
    <Button
      type="text"
      size="small"
      onClick={onClick}
      style={{ width: "100%" }}
    >
      <Space orientation="vertical" size={0} style={{ width: "100%" }}>
        {grade ? (
          <>
            <Typography.Text strong>
              {grade.rawScore ?? 0} / {grade.maxScore ?? 0}
            </Typography.Text>
            <Typography.Text style={{ fontSize: 11 }}>
              {grade.percentage ?? 0}%{" "}
              {grade.letterGrade ? `(${grade.letterGrade})` : ""}
            </Typography.Text>
            {grade.isAutoGraded && <Tag color="blue">Auto</Tag>}
          </>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        )}
      </Space>
    </Button>
  );

  const openGradeModal = (
    activityId: number | null,
    userId: string | null,
    grade?: GradeEntry,
  ) => {
    const targetActivityId = grade?.activityId ?? activityId ?? null;
    const targetSectionId =
      targetActivityId !== null
        ? (activityMap.get(targetActivityId)?.sectionId ?? null)
        : null;
    form.setFieldsValue({
      sectionId: targetSectionId,
      activityId: targetActivityId,
      userId: userId ?? "",
      rawScore: grade?.rawScore ?? null,
      maxScore: grade?.maxScore ?? null,
      feedback: grade?.feedback ?? "",
      gradeCategoryId: grade?.gradeCategoryId ?? null,
    });
    setSubmitOpen(true);
  };

  const columns: ColumnsType<StudentRow> = [
    {
      title: "Student",
      key: "student",
      fixed: "left",
      width: 220,
      render: (_, student) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>
            {student.userName ?? "Unknown"}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {student.userEmail}
          </Typography.Text>
          {student.status === "completed" && (
            <Tag color="green" style={{ width: "fit-content" }}>
              Completed
            </Tag>
          )}
        </Space>
      ),
    },
    ...activities.map((act) => ({
      key: `activity-${act.id}`,
      title: (
        <Space orientation="vertical" size={0}>
          <Typography.Text>{act.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {act.sectionTitle}
          </Typography.Text>
        </Space>
      ),
      width: 120,
      align: "center" as const,
      render: (_: unknown, student: StudentRow) => {
        const grade = student.gradeByActivity.get(act.id);
        return (
          <GradeCell
            grade={grade}
            onClick={() => openGradeModal(act.id, student.userId, grade)}
          />
        );
      },
    })),
    {
      title: "Final",
      key: "final",
      fixed: "right",
      width: 120,
      align: "center",
      render: (_, student) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>
            {student.finalPercentage ?? "—"}%
          </Typography.Text>
          <Typography.Text>{student.letterGrade ?? "—"}</Typography.Text>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Typography.Text type="secondary">
          {students.length} student{students.length !== 1 ? "s" : ""}
        </Typography.Text>
        <Space>
          <CategoryManager courseId={courseId} />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openGradeModal(null, null)}
          >
            Submit Grade
          </Button>
        </Space>
      </div>

      <Table
        dataSource={dataSource}
        columns={columns}
        rowKey="userId"
        loading={isLoading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        scroll={{ x: "max-content" }}
        locale={{ emptyText: "No students or grades yet." }}
      />

      <Modal
        title="Submit Grade"
        open={submitOpen}
        onCancel={() => {
          setSubmitOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={submitGrade.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => {
            if (
              v.activityId === null ||
              v.userId === "" ||
              v.rawScore === null ||
              v.maxScore === null
            ) {
              return;
            }
            submitGrade.mutate({
              activityId: v.activityId,
              userId: v.userId,
              rawScore: v.rawScore,
              maxScore: v.maxScore,
              feedback: v.feedback,
              gradeCategoryId: v.gradeCategoryId ?? null,
            });
          }}
        >
          <Form.Item
            name="sectionId"
            label="Section"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder="Select a section"
              style={{ width: "100%" }}
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={sections.map((s) => ({
                value: s.id,
                label: s.title,
              }))}
              onChange={() => form.setFieldValue("activityId", null)}
            />
          </Form.Item>
          <Form.Item
            name="activityId"
            label="Activity"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              disabled={
                selectedSectionId === undefined || selectedSectionId === null
              }
              placeholder="Select an activity"
              style={{ width: "100%" }}
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={activities
                .filter((a) => a.sectionId === selectedSectionId)
                .map((a) => ({
                  value: a.id,
                  label: `${a.title} (${a.type})`,
                }))}
            />
          </Form.Item>
          <Form.Item name="userId" label="Student" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Select a student"
              style={{ width: "100%" }}
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={students.map((s) => ({
                value: s.userId,
                label: `${s.userName ?? s.userEmail} (${s.userEmail})${
                  s.status === "completed" ? " — Completed" : ""
                }`,
              }))}
            />
          </Form.Item>
          <Form.Item name="rawScore" label="Score" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="maxScore"
            label="Max Score"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="gradeCategoryId" label="Grade Category">
            <Select
              allowClear
              placeholder="Optional category override"
              style={{ width: "100%" }}
              options={categories.map((cat) => ({
                value: cat.id,
                label: `${cat.name} (${cat.weight}%)`,
              }))}
            />
          </Form.Item>
          <Form.Item name="feedback" label="Feedback">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
