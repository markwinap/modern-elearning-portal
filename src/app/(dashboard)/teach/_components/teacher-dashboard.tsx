"use client";

import { useState } from "react";
import { Button, Space, Switch, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";

import { EntityTable } from "~/components/ui/entity-table";
import {
  BookOutlined,
  EditOutlined,
  EyeOutlined,
  MessageOutlined,
  NotificationOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import Link from "next/link";

import { EmptyState } from "~/components/ui/empty-state";
import { StatusBadge } from "~/components/ui/status-badge";

interface Course {
  id: number;
  title: string;
  slug: string;
  status: string;
  createdAt: Date;
  coverImageUrl: string | null;
  teacherId: string;
  teacherName: string | null;
}

interface Props {
  courses: Course[];
  currentUserId: string;
  role: "student" | "teacher" | "admin";
}

export function TeacherDashboard({ courses, currentUserId, role }: Props) {
  const { token } = theme.useToken();
  const [showMineOnly, setShowMineOnly] = useState(false);

  const visibleCourses = showMineOnly
    ? courses.filter((c) => c.teacherId === currentUserId)
    : courses;

  const columns: ColumnsType<Course> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (title: string, course) => (
        <Space>
          <BookOutlined style={{ color: token.colorPrimary }} />
          <Typography.Text strong>{title}</Typography.Text>
          <StatusBadge status={course.status} />
        </Space>
      ),
    },
    {
      title: "Teacher",
      dataIndex: "teacherName",
      key: "teacherName",
      width: 180,
      render: (name: string | null) =>
        name ?? <Typography.Text type="secondary">—</Typography.Text>,
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
      render: (_: unknown, course) => {
        const canManage =
          course.teacherId === currentUserId || role === "admin";

        if (!canManage) {
          return (
            <Link href={`/courses/${course.slug}`}>
              <Button size="small" icon={<EyeOutlined />}>
                View
              </Button>
            </Link>
          );
        }

        return (
          <Space wrap>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined aria-hidden />}
              href={`/teach/courses/${course.id}/edit`}
            >
              Edit
            </Button>
            <Button
              type="link"
              size="small"
              icon={<BookOutlined aria-hidden />}
              href={`/teach/courses/${course.id}/sections`}
            >
              Sections
            </Button>
            <Button
              type="link"
              size="small"
              icon={<TeamOutlined aria-hidden />}
              href={`/teach/courses/${course.id}/students`}
            >
              Students
            </Button>
            <Button
              type="link"
              size="small"
              icon={<TrophyOutlined aria-hidden />}
              href={`/teach/courses/${course.id}/gradebook`}
            >
              Grades
            </Button>
            <Button
              type="link"
              size="small"
              icon={<NotificationOutlined aria-hidden />}
              href={`/teach/courses/${course.id}/announcements`}
            >
              Announce
            </Button>
            <Button
              type="link"
              size="small"
              icon={<MessageOutlined aria-hidden />}
              href={`/teach/courses/${course.id}/discussions`}
            >
              Discuss
            </Button>
          </Space>
        );
      },
    },
  ];

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={<BookOutlined />}
        title="No courses yet"
        description="Create your first course to get started."
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Switch
          checked={showMineOnly}
          onChange={setShowMineOnly}
          checkedChildren="My courses only"
          unCheckedChildren="All courses"
        />
      </div>
      {visibleCourses.length === 0 ? (
        <EmptyState
          icon={<BookOutlined />}
          title="No courses match this filter"
          description="Turn off the filter or create a new course."
        />
      ) : (
        <EntityTable
          dataSource={visibleCourses}
          columns={columns}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
        />
      )}
    </div>
  );
}
