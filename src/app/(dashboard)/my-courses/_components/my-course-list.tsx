"use client";

import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { BookOutlined } from "@ant-design/icons";
import Link from "next/link";

interface Enrollment {
  id: number;
  courseId: number;
  status: string;
  enrolledAt: Date;
  courseTitle: string;
  courseSlug: string;
  courseCoverImageUrl: string | null;
}

interface Props {
  enrollments: Enrollment[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "processing",
  completed: "success",
  suspended: "error",
  waitlisted: "warning",
};

export function MyCourseList({ enrollments }: Props) {
  const tabs = [
    {
      key: "all",
      label: `All (${enrollments.length})`,
      statuses: ["active", "completed", "waitlisted", "suspended"],
    },
    { key: "active", label: "Active", statuses: ["active"] },
    { key: "completed", label: "Completed", statuses: ["completed"] },
  ];

  function CourseGrid({ statuses }: { statuses: string[] }) {
    const filtered = enrollments.filter((e) => statuses.includes(e.status));
    if (filtered.length === 0) {
      return (
        <Empty
          description="No courses here yet."
          style={{ marginTop: 48 }}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Link href="/courses">
            <Button type="primary" icon={<BookOutlined />}>
              Browse Courses
            </Button>
          </Link>
        </Empty>
      );
    }

    return (
      <Row gutter={[24, 24]}>
        {filtered.map((enrollment) => (
          <Col key={enrollment.id} xs={24} sm={12} xl={8}>
            <Card
              hoverable
              cover={
                enrollment.courseCoverImageUrl ? (
                  <img
                    src={enrollment.courseCoverImageUrl}
                    alt={enrollment.courseTitle}
                    style={{ height: 140, objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      height: 140,
                      background:
                        "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{ color: "#fff", fontSize: 28, fontWeight: 700 }}
                    >
                      {enrollment.courseTitle.charAt(0)}
                    </span>
                  </div>
                )
              }
            >
              <Space orientation="vertical" style={{ width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <Typography.Text strong style={{ fontSize: 15 }}>
                    {enrollment.courseTitle}
                  </Typography.Text>
                  <Tag color={STATUS_COLORS[enrollment.status] ?? "default"}>
                    {enrollment.status}
                  </Tag>
                </div>

                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Enrolled{" "}
                  {new Date(enrollment.enrolledAt).toLocaleDateString()}
                </Typography.Text>

                <Link href={`/courses/${enrollment.courseSlug}/learn`}>
                  <Button
                    type={
                      enrollment.status === "completed" ? "default" : "primary"
                    }
                    block
                  >
                    {enrollment.status === "completed"
                      ? "Review Course"
                      : "Continue Learning"}
                  </Button>
                </Link>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <div>
      <Typography.Title level={2} style={{ marginBottom: 24 }}>
        My Courses
      </Typography.Title>

      {enrollments.length === 0 ? (
        <Empty
          description="You haven't enrolled in any courses yet."
          style={{ marginTop: 64 }}
        >
          <Link href="/courses">
            <Button type="primary" size="large" icon={<BookOutlined />}>
              Browse Courses
            </Button>
          </Link>
        </Empty>
      ) : (
        <Tabs
          items={tabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: <CourseGrid statuses={tab.statuses} />,
          }))}
        />
      )}
    </div>
  );
}
