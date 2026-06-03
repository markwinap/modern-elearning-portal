"use client";

import { Select, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";

import { api } from "~/trpc/react";

interface Student {
  enrollmentId: number;
  userId: string;
  status: string;
  enrolledAt: Date;
  userName: string | null;
  userEmail: string;
}

interface Props {
  students: Student[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "success",
  suspended: "error",
  completed: "processing",
  waitlisted: "warning",
};

export function StudentsTable({ students }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const utils = api.useUtils();

  const updateStatus = api.enrollment.updateStatus.useMutation({
    onSuccess: () => messageApi.success("Status updated"),
    onError: (err) => messageApi.error(err.message),
  });

  const columns: ColumnsType<Student> = [
    {
      title: "Name",
      key: "name",
      render: (_: unknown, s) => (
        <div>
          <Typography.Text strong>{s.userName ?? "—"}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{s.userEmail}</Typography.Text>
        </div>
      ),
    },
    {
      title: "Enrolled",
      dataIndex: "enrolledAt",
      key: "enrolledAt",
      width: 140,
      render: (d: Date) => new Date(d).toLocaleDateString(),
    },
    {
      title: "Status",
      key: "status",
      width: 180,
      render: (_: unknown, s) => (
        <Select
          size="small"
          value={s.status}
          style={{ width: 140 }}
          loading={updateStatus.isPending}
          onChange={(val) =>
            updateStatus.mutate({
              enrollmentId: s.enrollmentId,
              status: val as "active" | "suspended" | "completed" | "waitlisted",
            })
          }
          options={[
            { value: "active", label: <Tag color="success">Active</Tag> },
            { value: "suspended", label: <Tag color="error">Suspended</Tag> },
            { value: "completed", label: <Tag color="processing">Completed</Tag> },
            { value: "waitlisted", label: <Tag color="warning">Waitlisted</Tag> },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <div style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">{students.length} student{students.length !== 1 ? "s" : ""} enrolled</Typography.Text>
      </div>
      <Table
        dataSource={students}
        columns={columns}
        rowKey="enrollmentId"
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No students enrolled yet." }}
      />
    </>
  );
}
