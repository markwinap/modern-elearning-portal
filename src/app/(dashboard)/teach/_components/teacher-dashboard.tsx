"use client";

import { Button, Space, Table, Tag, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  BookOutlined,
  EditOutlined,
  TeamOutlined,
  TrophyOutlined,
  NotificationOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import Link from "next/link";

interface Course {
  id: number;
  title: string;
  slug: string;
  status: string;
  createdAt: Date;
  coverImageUrl: string | null;
}

interface Props {
  courses: Course[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "default",
  published: "success",
  archived: "warning",
};

export function TeacherDashboard({ courses }: Props) {
  const { token } = theme.useToken();
  const columns: ColumnsType<Course> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (title: string, course) => (
        <Space>
          <BookOutlined style={{ color: token.colorPrimary }} />
          <Typography.Text strong>{title}</Typography.Text>
          <Tag color={STATUS_COLORS[course.status] ?? "default"}>{course.status}</Tag>
        </Space>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      render: (date: Date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 380,
      render: (_: unknown, course) => (
        <Space wrap>
          <Link href={`/teach/courses/${course.id}/edit`}>
            <Button size="small" icon={<EditOutlined />}>Edit</Button>
          </Link>
          <Link href={`/teach/courses/${course.id}/sections`}>
            <Button size="small" icon={<BookOutlined />}>Sections</Button>
          </Link>
          <Link href={`/teach/courses/${course.id}/students`}>
            <Button size="small" icon={<TeamOutlined />}>Students</Button>
          </Link>
          <Link href={`/teach/courses/${course.id}/gradebook`}>
            <Button size="small" icon={<TrophyOutlined />}>Grades</Button>
          </Link>
          <Link href={`/teach/courses/${course.id}/announcements`}>
            <Button size="small" icon={<NotificationOutlined />}>Announce</Button>
          </Link>
          <Link href={`/teach/courses/${course.id}/discussions`}>
            <Button size="small" icon={<MessageOutlined />}>Discuss</Button>
          </Link>
        </Space>
      ),
    },
  ];

  if (courses.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0" }}>
        <BookOutlined style={{ fontSize: 48, color: token.colorTextDisabled, marginBottom: 16 }} />
        <Typography.Title level={4} type="secondary">No courses yet</Typography.Title>
        <Typography.Text type="secondary">Create your first course to get started.</Typography.Text>
      </div>
    );
  }

  return (
    <Table
      dataSource={courses}
      columns={columns}
      rowKey="id"
      pagination={{ pageSize: 20, hideOnSinglePage: true }}
    />
  );
}
