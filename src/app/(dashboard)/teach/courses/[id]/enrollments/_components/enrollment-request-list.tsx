"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Space, Table, Tag, Typography, message } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

import { useTRPC, type RouterOutputs } from "~/trpc/react";

type PendingEnrollment = RouterOutputs["enrollment"]["listPending"][number];

interface Props {
  courseId: number;
}

export function EnrollmentRequestList({ courseId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const { data: requests = [] } = useQuery(
    trpc.enrollment.listPending.queryOptions({ courseId }),
  );

  const approve = useMutation(
    trpc.enrollment.approve.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.enrollment.listPending.queryKey({ courseId }),
        });
        void messageApi.success("Enrollment approved.");
      },
      onError: (err: { message: string }) => {
        void messageApi.error(err.message);
      },
    }),
  );

  const reject = useMutation(
    trpc.enrollment.reject.mutationOptions({
      onSuccess: () => {
        setRejectingId(null);
        setRejectionReason("");
        void queryClient.invalidateQueries({
          queryKey: trpc.enrollment.listPending.queryKey({ courseId }),
        });
        void messageApi.success("Enrollment rejected.");
      },
      onError: (err: { message: string }) => {
        void messageApi.error(err.message);
      },
    }),
  );

  return (
    <>
      {contextHolder}
      <Typography.Title level={4}>Enrollment Requests</Typography.Title>
      <Table<PendingEnrollment>
        dataSource={requests}
        rowKey="enrollmentId"
        pagination={false}
        locale={{ emptyText: "No pending enrollment requests." }}
        columns={[
          {
            title: "Student",
            render: (_, record) => (
              <Space direction="vertical" size={0}>
                <Typography.Text strong>
                  {record.userName ?? "—"}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {record.userEmail}
                </Typography.Text>
              </Space>
            ),
          },
          {
            title: "Requested",
            render: (_, record) =>
              new Date(record.enrolledAt).toLocaleString(),
          },
          {
            title: "Status",
            render: () => <Tag color="processing">Pending</Tag>,
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => approve.mutate({ enrollmentId: record.enrollmentId })}
                  loading={approve.isPending}
                >
                  Approve
                </Button>
                {rejectingId === record.enrollmentId ? (
                  <Space>
                    <Input
                      placeholder="Reason (optional)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={() =>
                        reject.mutate({
                          enrollmentId: record.enrollmentId,
                          reason: rejectionReason || undefined,
                        })
                      }
                      loading={reject.isPending}
                    >
                      Confirm Reject
                    </Button>
                  </Space>
                ) : (
                  <Button
                    danger
                    icon={<CloseOutlined />}
                    onClick={() => setRejectingId(record.enrollmentId)}
                  >
                    Reject
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
