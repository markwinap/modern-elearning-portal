"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  Modal,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CalendarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { api } from "~/trpc/react";

interface Course {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  teacherId: string;
  status: string;
  maxEnrollments: number | null;
  accessKey: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
}

interface Props {
  course: Course;
  enrollment: { id?: number; status: string } | null;
}

export function CourseDetailClient({ course, enrollment }: Props) {
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const [accessKeyModalOpen, setAccessKeyModalOpen] = useState(false);
  const [accessKeyInput, setAccessKeyInput] = useState("");

  const enrollMutation = api.enrollment.enroll.useMutation({
    onSuccess: () => {
      messageApi.success("Enrolled successfully!");
      router.push(`/courses/${course.slug}/learn`);
    },
    onError: (err) => messageApi.error(err.message),
  });

  function handleEnroll() {
    if (course.accessKey) {
      setAccessKeyModalOpen(true);
    } else {
      enrollMutation.mutate({ courseId: course.id });
    }
  }

  function handleAccessKeySubmit() {
    enrollMutation.mutate({ courseId: course.id, accessKey: accessKeyInput });
    setAccessKeyModalOpen(false);
  }

  const isEnrolled = !!enrollment && enrollment.status === "active";
  const isCompleted = enrollment?.status === "completed";

  return (
    <>
      {contextHolder}

      {/* Banner */}
      <div
        style={{
          height: 280,
          background: course.coverImageUrl
            ? `url(${course.coverImageUrl}) center/cover`
            : "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
          borderRadius: 8,
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-end",
          padding: 32,
        }}
      >
        <Typography.Title level={1} style={{ color: "#fff", margin: 0, textShadow: "0 2px 4px rgba(0,0,0,0.4)" }}>
          {course.title}
        </Typography.Title>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card>
            <Typography.Title level={4}>About this course</Typography.Title>
            {course.description ? (
              <Typography.Paragraph style={{ fontSize: 15, lineHeight: 1.7 }}>
                {course.description}
              </Typography.Paragraph>
            ) : (
              <Typography.Text type="secondary">No description provided.</Typography.Text>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card>
            <Space orientation="vertical" style={{ width: "100%" }} size="middle">
              {isCompleted && (
                <Alert title="You have completed this course!" type="success" showIcon />
              )}
              {isEnrolled ? (
                <Link href={`/courses/${course.slug}/learn`}>
                  <Button type="primary" size="large" block>
                    Continue Learning
                  </Button>
                </Link>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  block
                  loading={enrollMutation.isPending}
                  onClick={handleEnroll}
                >
                  Enroll Now
                  {course.accessKey ? " (Access Key Required)" : ""}
                </Button>
              )}

              <Descriptions column={1} size="small">
                {course.startsAt && (
                  <Descriptions.Item label={<><CalendarOutlined /> Starts</>}>
                    {new Date(course.startsAt).toLocaleDateString()}
                  </Descriptions.Item>
                )}
                {course.endsAt && (
                  <Descriptions.Item label={<><CalendarOutlined /> Ends</>}>
                    {new Date(course.endsAt).toLocaleDateString()}
                  </Descriptions.Item>
                )}
                {course.maxEnrollments && (
                  <Descriptions.Item label={<><TeamOutlined /> Capacity</>}>
                    {course.maxEnrollments} students
                  </Descriptions.Item>
                )}
              </Descriptions>

              <div>
                <Tag color={course.status === "published" ? "green" : "default"}>
                  {course.status}
                </Tag>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal
        title="Access Key Required"
        open={accessKeyModalOpen}
        onOk={handleAccessKeySubmit}
        onCancel={() => setAccessKeyModalOpen(false)}
        okText="Enroll"
        okButtonProps={{ loading: enrollMutation.isPending }}
      >
        <Typography.Paragraph>
          This course requires an access key. Please enter it below:
        </Typography.Paragraph>
        <Input
          placeholder="Enter access key"
          value={accessKeyInput}
          onChange={(e) => setAccessKeyInput(e.target.value)}
          onPressEnter={handleAccessKeySubmit}
        />
      </Modal>
    </>
  );
}
