"use client";

import { Button, Popconfirm, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, EditOutlined, InboxOutlined } from "@ant-design/icons";
import Link from "next/link";

import { api } from "~/trpc/react";

interface Course {
  id: number;
  title: string;
  slug: string;
  status: string;
  createdAt: Date;
  teacherName: string | null;
}

interface Props {
  courses: Course[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "default",
  published: "success",
  archived: "warning",
};

export function AdminCoursesTable({ courses: initialCourses }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const utils = api.useUtils();

  const { data: courses = initialCourses } = api.course.listAll.useQuery({ page: 1, limit: 50 });

  const publishCourse = api.course.publish.useMutation({
    onSuccess: () => {
      void utils.course.listAll.invalidate();
      messageApi.success("Course published!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const archiveCourse = api.course.archive.useMutation({
    onSuccess: () => {
      void utils.course.listAll.invalidate();
      messageApi.success("Course archived.");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const columns: ColumnsType<Course> = [
    {
      title: "Title",
      key: "title",
      render: (_: unknown, c: Course) => (
        <div>
          <Link href={`/teach/courses/${c.id}/edit`}>
            <Typography.Text strong style={{ color: "#4F46E5" }}>{c.title}</Typography.Text>
          </Link>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>/{c.slug}</Typography.Text>
        </div>
      ),
    },
    {
      title: "Teacher",
      dataIndex: "teacherName",
      key: "teacherName",
      width: 160,
      render: (name: string | null) => name ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s: string) => <Tag color={STATUS_COLORS[s] ?? "default"}>{s}</Tag>,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (d: Date) => new Date(d).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 220,
      render: (_: unknown, c: Course) => (
        <Space>
          <Link href={`/teach/courses/${c.id}/edit`}>
            <Button size="small" icon={<EditOutlined />}>Edit</Button>
          </Link>
          {c.status === "draft" && (
            <Popconfirm title="Publish this course?" onConfirm={() => publishCourse.mutate({ id: c.id })}>
              <Button size="small" icon={<CheckOutlined />} loading={publishCourse.isPending}>
                Publish
              </Button>
            </Popconfirm>
          )}
          {c.status !== "archived" && (
            <Popconfirm title="Archive this course?" onConfirm={() => archiveCourse.mutate({ id: c.id })}>
              <Button size="small" icon={<InboxOutlined />} loading={archiveCourse.isPending}>
                Archive
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Table
        dataSource={courses}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No courses found." }}
      />
    </>
  );
}
