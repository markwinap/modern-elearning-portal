"use client";

import type { ReactNode } from "react";
import { Breadcrumb, Button, Menu, Tag, Typography } from "antd";
import {
  EditOutlined,
  BookOutlined,
  EyeOutlined,
  TeamOutlined,
  TrophyOutlined,
  NotificationOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTheme } from "~/components/theme/theme-context";

interface Course {
  id: number;
  title: string;
  slug: string;
  status: string;
}

interface Props {
  course: Course;
  courseId: number;
  children: ReactNode;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "default",
  published: "success",
  archived: "warning",
};

const NAV_ITEMS = (id: number) => [
  { key: "edit", label: <Link href={`/teach/courses/${id}/edit`}>Edit</Link>, icon: <EditOutlined /> },
  { key: "sections", label: <Link href={`/teach/courses/${id}/sections`}>Sections</Link>, icon: <BookOutlined /> },
  { key: "students", label: <Link href={`/teach/courses/${id}/students`}>Students</Link>, icon: <TeamOutlined /> },
  { key: "gradebook", label: <Link href={`/teach/courses/${id}/gradebook`}>Gradebook</Link>, icon: <TrophyOutlined /> },
  { key: "announcements", label: <Link href={`/teach/courses/${id}/announcements`}>Announcements</Link>, icon: <NotificationOutlined /> },
  { key: "discussions", label: <Link href={`/teach/courses/${id}/discussions`}>Discussions</Link>, icon: <MessageOutlined /> },
];

export function CourseManageLayout({ course, courseId, children }: Props) {
  const pathname = usePathname();
  const { isDark } = useTheme();
  const activeKey = NAV_ITEMS(courseId).find((item) =>
    pathname.includes(`/${item.key}`)
  )?.key ?? "edit";

  return (
    <div>
      <Breadcrumb
        items={[
          { title: <Link href="/teach">My Courses</Link> },
          { title: course.title },
        ]}
        style={{ marginBottom: 12 }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {course.title}
        </Typography.Title>
        <Tag color={STATUS_COLORS[course.status] ?? "default"}>{course.status}</Tag>
        <div style={{ marginLeft: "auto" }}>
          <Link href={`/courses/${course.slug}/learn`} target="_blank">
            <Button icon={<EyeOutlined />}>Preview Course</Button>
          </Link>
        </div>
      </div>

      <Menu
        theme={isDark ? "dark" : "light"}
        mode="horizontal"
        selectedKeys={[activeKey]}
        items={NAV_ITEMS(courseId)}
        style={{ marginBottom: 24, borderBottom: "1px solid #f0f0f0" }}
      />

      {children}
    </div>
  );
}
