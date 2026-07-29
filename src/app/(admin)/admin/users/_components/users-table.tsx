"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { useState } from "react";
import {
  Badge,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";

import { EntityTable } from "~/components/ui/entity-table";
import { StopOutlined, CheckCircleOutlined } from "@ant-design/icons";

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
}

interface Props {
  users: User[];
}

export function UsersTable({ users: initialUsers }: Props) {
  const trpc = useTRPC();
  const [messageApi, contextHolder] = message.useMessage();
  const [banTarget, setBanTarget] = useState<User | null>(null);
  const [banForm] = Form.useForm<{ reason: string }>();
  const queryClient = useQueryClient();

  const { data: users = initialUsers, isLoading } = useQuery(
    trpc.user.listUsers.queryOptions({ page: 1, limit: 50 }),
  );

  const setRole = useMutation(
    trpc.user.setRole.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.user.listUsers.queryKey(),
        });
        messageApi.success("Role updated");
      },
      onError: (err) => messageApi.error(err.message),
    }),
  );

  const banUser = useMutation(
    trpc.user.banUser.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.user.listUsers.queryKey(),
        });
        setBanTarget(null);
        banForm.resetFields();
        messageApi.success("User banned");
      },
      onError: (err) => messageApi.error(err.message),
    }),
  );

  const unbanUser = useMutation(
    trpc.user.unbanUser.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.user.listUsers.queryKey(),
        });
        messageApi.success("User unbanned");
      },
      onError: (err) => messageApi.error(err.message),
    }),
  );

  const columns: ColumnsType<User> = [
    {
      title: "User",
      key: "user",
      render: (_: unknown, u: User) => (
        <div>
          <Typography.Text strong>{u.name}</Typography.Text>
          {u.banned && <Badge status="error" style={{ marginLeft: 6 }} />}
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {u.email}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Role",
      key: "role",
      width: 180,
      render: (_: unknown, u: User) => (
        <Select
          size="small"
          value={u.role ?? "student"}
          style={{ width: 120 }}
          loading={setRole.isPending}
          onChange={(val) =>
            setRole.mutate({
              userId: u.id,
              role: val as "student" | "teacher" | "admin",
            })
          }
          options={[
            { value: "student", label: <Tag color="green">student</Tag> },
            { value: "teacher", label: <Tag color="blue">teacher</Tag> },
            { value: "admin", label: <Tag color="red">admin</Tag> },
          ]}
        />
      ),
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (d: Date) => new Date(d).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, u: User) =>
        u.banned ? (
          <Popconfirm
            title="Unban this user?"
            onConfirm={() => unbanUser.mutate({ userId: u.id })}
          >
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              loading={unbanUser.isPending}
            >
              Unban
            </Button>
          </Popconfirm>
        ) : (
          <Button
            size="small"
            danger
            icon={<StopOutlined />}
            onClick={() => setBanTarget(u)}
          >
            Ban
          </Button>
        ),
    },
  ];

  return (
    <>
      {contextHolder}
      <EntityTable
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
      />

      <Modal
        title={`Ban ${banTarget?.name}`}
        open={!!banTarget}
        onCancel={() => {
          setBanTarget(null);
          banForm.resetFields();
        }}
        onOk={() => banForm.submit()}
        confirmLoading={banUser.isPending}
        okButtonProps={{ danger: true }}
        okText="Ban User"
      >
        <Form
          form={banForm}
          layout="vertical"
          onFinish={(v) => {
            if (banTarget)
              banUser.mutate({ userId: banTarget.id, reason: v.reason });
          }}
        >
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Reason for ban…" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
