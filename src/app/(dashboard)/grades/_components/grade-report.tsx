"use client";

import Link from "next/link";
import { Card, Progress, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { BookOutlined } from "@ant-design/icons";
import type { inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "~/server/api/root";

type GradeSummary =
  inferRouterOutputs<AppRouter>["gradebook"]["getMyGradeSummary"];

interface GradeReportProps {
  summary: GradeSummary;
}

export function GradeReport({ summary }: GradeReportProps) {
  const { courses } = summary;

  if (courses.length === 0) {
    return (
      <Typography.Text type="secondary">
        No grades available yet. Complete gradable activities to see your
        scores.
      </Typography.Text>
    );
  }

  return (
    <div>
      <Typography.Title level={3}>My Grades</Typography.Title>
      <Space orientation="vertical" style={{ width: "100%" }} size="large">
        {courses.map((course) => (
          <CourseCard key={course.courseId} course={course} />
        ))}
      </Space>
    </div>
  );
}

type Grade = GradeSummary["courses"][number]["grades"][number];
type Breakdown = GradeSummary["courses"][number]["breakdown"][number];

function CourseCard({ course }: { course: GradeSummary["courses"][number] }) {
  const columns: ColumnsType<Grade> = [
    {
      title: "Activity",
      dataIndex: "activityTitle",
      render: (_, record: Grade) => (
        <Space>
          <BookOutlined />
          <Typography.Text>{record.activityTitle}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.sectionTitle}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Score",
      key: "score",
      align: "center",
      render: (_, record: Grade) =>
        `${record.rawScore ?? 0} / ${record.maxScore ?? 0}`,
    },
    {
      title: "Percentage",
      dataIndex: "percentage",
      align: "center",
      render: (_, record: Grade) => `${record.percentage ?? 0}%`,
    },
    {
      title: "Letter",
      dataIndex: "letterGrade",
      align: "center",
      render: (_, record: Grade) => <Tag>{record.letterGrade ?? "—"}</Tag>,
    },
    {
      title: "Category",
      dataIndex: "gradeCategoryName",
      render: (_, record: Grade) => record.gradeCategoryName ?? "Uncategorized",
    },
    {
      title: "Feedback",
      dataIndex: "feedback",
      render: (_, record: Grade) => record.feedback ?? "—",
    },
    {
      title: "Source",
      dataIndex: "isAutoGraded",
      align: "center",
      render: (_, record: Grade) =>
        record.isAutoGraded ? <Tag color="blue">Auto</Tag> : <Tag>Manual</Tag>,
    },
    {
      title: "Graded",
      dataIndex: "gradedAt",
      render: (_, record: Grade) =>
        record.gradedAt ? new Date(record.gradedAt).toLocaleDateString() : "—",
    },
  ];

  const breakdownColumns: ColumnsType<Breakdown> = [
    {
      title: "Category",
      dataIndex: "name",
    },
    {
      title: "Weight",
      dataIndex: "weight",
      align: "center",
      render: (_, record: Breakdown) => `${record.weight}%`,
    },
    {
      title: "Average",
      dataIndex: "average",
      align: "center",
      render: (_, record: Breakdown) => `${record.average}%`,
    },
  ];

  return (
    <Card
      title={
        <Link
          href={`/courses/${course.courseSlug}`}
          style={{ fontWeight: "bold" }}
        >
          {course.courseTitle}
        </Link>
      }
      extra={
        <Space>
          <Typography.Text strong style={{ fontSize: 16 }}>
            {course.finalPercentage ?? "—"}%
          </Typography.Text>
          <Tag color="green" style={{ fontSize: 14 }}>
            {course.letterGrade ?? "—"}
          </Tag>
        </Space>
      }
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="large">
        {course.finalPercentage !== null && (
          <Progress percent={course.finalPercentage} status="active" />
        )}

        {course.breakdown.length > 0 && (
          <>
            <Typography.Text strong>Category Breakdown</Typography.Text>
            <Table
              size="small"
              pagination={false}
              dataSource={course.breakdown}
              rowKey={(row: Breakdown) =>
                `${row.categoryId ?? "uncategorized"}-${row.name}`
              }
              columns={breakdownColumns}
            />
          </>
        )}

        <Typography.Text strong>Assignments</Typography.Text>
        <Table
          size="small"
          dataSource={course.grades}
          columns={columns}
          rowKey="id"
          pagination={false}
        />
      </Space>
    </Card>
  );
}
