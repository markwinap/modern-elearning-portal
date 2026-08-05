"use client";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { useState } from "react";
import {
  Alert,
  Avatar,
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
  theme,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  MessageOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EntityTable } from "~/components/ui/entity-table";

interface CourseSession {
  id: number;
  dayOfWeek: number;
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  classroom: string | null;
}

interface Course {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  teacherId: string;
  teacherName: string | null;
  teacherEmail: string | null;
  teacherImage: string | null;
  instructorBio: string | null;
  status: string;
  maxEnrollments: number | null;
  accessKey: string | null;
  locationType: "online" | "onsite";
  siteLocation: string | null;
  classroom: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  sessions: CourseSession[];
}

interface Props {
  course: Course;
  enrollment: { id?: number; status: string } | null;
}

export function CourseDetailClient({ course, enrollment }: Props) {
  const trpc = useTRPC();
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();
  const [accessKeyModalOpen, setAccessKeyModalOpen] = useState(false);
  const [accessKeyInput, setAccessKeyInput] = useState("");

  const enrollMutation = useMutation(
    trpc.enrollment.enroll.mutationOptions({
      onSuccess: () => {
        messageApi.success("Enrolled successfully!");
        router.push(`/courses/${course.slug}/learn`);
      },
      onError: (err) => messageApi.error(err.message),
    }),
  );

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

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const formatTime = (time: string) => {
    const date = new Date("1970-01-01T" + time);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {contextHolder}

      {/* Banner */}
      <div
        style={{
          height: 280,
          background: course.coverImageUrl
            ? `url(${course.coverImageUrl}) center/cover`
            : `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
          borderRadius: 8,
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-end",
          padding: 32,
        }}
      >
        <Typography.Title
          level={1}
          style={{
            color: "#fff",
            margin: 0,
            textShadow: "0 2px 4px rgba(0,0,0,0.4)",
          }}
        >
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
              <Typography.Text type="secondary">
                No description provided.
              </Typography.Text>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card>
            <Space
              orientation="vertical"
              style={{ width: "100%" }}
              size="middle"
            >
              {isCompleted && (
                <Alert
                  title="You have completed this course!"
                  type="success"
                  showIcon
                />
              )}
              {isEnrolled ? (
                <Space orientation="vertical" style={{ width: "100%" }}>
                  <Link href={`/courses/${course.slug}/learn`}>
                    <Button type="primary" size="large" block>
                      Continue Learning
                    </Button>
                  </Link>
                  <Link href={`/courses/${course.slug}/discussions`}>
                    <Button size="large" block icon={<MessageOutlined />}>
                      Discussions
                    </Button>
                  </Link>
                </Space>
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

              {course.teacherName && (
                <div>
                  <Typography.Text strong>Instructor</Typography.Text>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 8,
                    }}
                  >
                    <Avatar
                      size={48}
                      src={course.teacherImage}
                      icon={<UserOutlined />}
                    />
                    <div>
                      <Typography.Text strong>
                        {course.teacherName}
                      </Typography.Text>
                      {course.teacherEmail && (
                        <>
                          <br />
                          <Typography.Text type="secondary">
                            {course.teacherEmail}
                          </Typography.Text>
                        </>
                      )}
                    </div>
                  </div>
                  {course.instructorBio && (
                    <Typography.Paragraph
                      type="secondary"
                      style={{ marginTop: 8, marginBottom: 0 }}
                    >
                      {course.instructorBio}
                    </Typography.Paragraph>
                  )}
                </div>
              )}

              <Descriptions column={1} size="small">
                <Descriptions.Item
                  label={
                    <>
                      <EnvironmentOutlined /> Location
                    </>
                  }
                >
                  {course.locationType === "online" ? "Online" : "On-Site"}
                  {course.locationType === "onsite" &&
                    course.siteLocation &&
                    ` — ${course.siteLocation}`}
                  {course.locationType === "onsite" &&
                    course.classroom &&
                    ` (${course.classroom})`}
                </Descriptions.Item>
                {course.startsAt && (
                  <Descriptions.Item
                    label={
                      <>
                        <CalendarOutlined /> Starts
                      </>
                    }
                  >
                    {new Date(course.startsAt).toLocaleDateString()}
                  </Descriptions.Item>
                )}
                {course.endsAt && (
                  <Descriptions.Item
                    label={
                      <>
                        <CalendarOutlined /> Ends
                      </>
                    }
                  >
                    {new Date(course.endsAt).toLocaleDateString()}
                  </Descriptions.Item>
                )}
                {course.maxEnrollments && (
                  <Descriptions.Item
                    label={
                      <>
                        <TeamOutlined /> Capacity
                      </>
                    }
                  >
                    {course.maxEnrollments} students
                  </Descriptions.Item>
                )}
              </Descriptions>

              {course.locationType === "onsite" &&
                course.sessions.length > 0 && (
                  <div>
                    <Typography.Text strong>
                      <ClockCircleOutlined /> Schedule
                    </Typography.Text>
                    <EntityTable
                      size="small"
                      pagination={false}
                      dataSource={course.sessions}
                      columns={[
                        {
                          title: "Day",
                          render: (_, record: CourseSession) =>
                            dayNames[record.dayOfWeek] ?? "Unknown",
                        },
                        {
                          title: "Time",
                          render: (_, record: CourseSession) =>
                            `${formatTime(record.startTime)} - ${formatTime(
                              record.endTime,
                            )}`,
                        },
                        {
                          title: "Dates",
                          render: (_, record: CourseSession) =>
                            record.endDate
                              ? `${record.startDate} to ${record.endDate}`
                              : record.startDate,
                        },
                        {
                          title: "Room",
                          render: (_, record: CourseSession) =>
                            record.classroom ?? course.classroom ?? "—",
                        },
                      ]}
                    />
                  </div>
                )}

              <div>
                <Tag
                  color={course.status === "published" ? "green" : "default"}
                >
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
