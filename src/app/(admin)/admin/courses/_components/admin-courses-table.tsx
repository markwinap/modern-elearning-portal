"use client";

import { App, Button, Popconfirm, Space, Table, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, EditOutlined, InboxOutlined } from "@ant-design/icons";
import Link from "next/link";

import { api } from "~/trpc/react";
import { StatusBadge } from "~/components/ui/status-badge";
import { toastMutationOptions } from "~/lib/mutation-utils";

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

export function AdminCoursesTable({ courses: initialCourses }: Props) {
  const { message: messageApi } = App.useApp();
  const { token } = theme.useToken();
  const utils = api.useUtils();

  const { data: courses = initialCourses, isLoading } =
    api.course.listAll.useQuery({ page: 1, limit: 50 });

  const publishCourse = api.course.publish.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Course published!",
      invalidate: () => utils.course.listAll.invalidate(),
    }),
  });

  const archiveCourse = api.course.archive.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Course archived.",
      invalidate: () => utils.course.listAll.invalidate(),
    }),
  });

  const columns: ColumnsType<Course> = [
    {
      title: "Title",
      key: "title",
      render: (_: unknown, c: Course) => (
        <div>
          <Link href={`/teach/courses/${c.id}/edit`}>
            <Typography.Text strong style={{ color: token.colorPrimary }}>
              {c.title}
            </Typography.Text>
          </Link>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            /{c.slug}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Teacher",
      dataIndex: "teacherName",
      key: "teacherName",
      width: 160,
      render: (name: string | null) =>
        name ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s: string) => <StatusBadge status={s} />,
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
            <Button size="small" icon={<EditOutlined />}>
              Edit
            </Button>
          </Link>
          {c.status === "draft" && (
            <Popconfirm
              title="Publish this course?"
              onConfirm={() => publishCourse.mutate({ id: c.id })}
            >
              <Button
                size="small"
                icon={<CheckOutlined />}
                loading={publishCourse.isPending}
              >
                Publish
              </Button>
            </Popconfirm>
          )}
          {c.status !== "archived" && (
            <Popconfirm
              title="Archive this course?"
              onConfirm={() => archiveCourse.mutate({ id: c.id })}
            >
              <Button
                size="small"
                icon={<InboxOutlined />}
                loading={archiveCourse.isPending}
              >
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
      <Table
        dataSource={courses}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No courses found." }}
      />
    </>
  );
}
