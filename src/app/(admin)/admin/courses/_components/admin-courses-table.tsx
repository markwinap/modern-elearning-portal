"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { App, Button, Popconfirm, Space, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";

import { EntityTable } from "~/components/ui/entity-table";
import { CheckOutlined, EditOutlined, InboxOutlined } from "@ant-design/icons";
import Link from "next/link";

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
  const trpc = useTRPC();
  const { message: messageApi } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  const { data: courses = initialCourses, isLoading } = useQuery(
    trpc.course.listAll.queryOptions({ page: 1, limit: 50 }),
  );

  const publishCourse = useMutation(
    trpc.course.publish.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Course published!",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.course.listAll.queryKey(),
          }),
      }),
    }),
  );

  const archiveCourse = useMutation(
    trpc.course.archive.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Course archived.",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.course.listAll.queryKey(),
          }),
      }),
    }),
  );

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
      <EntityTable
        dataSource={courses}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No courses found." }}
      />
    </>
  );
}
