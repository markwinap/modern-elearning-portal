"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Space,
  Typography,
  message,
  theme,
} from "antd";
import { PlusOutlined, DeleteOutlined, NotificationOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

interface Announcement {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
}

interface Props {
  courseId: number;
  initialAnnouncements: Announcement[];
}

interface FormValues {
  title: string;
  content: string;
}

export function AnnouncementsPanel({ courseId, initialAnnouncements }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [showForm, setShowForm] = useState(false);
  const [form] = Form.useForm<FormValues>();
  const utils = api.useUtils();
  const { token } = theme.useToken();

  const { data: announcements = initialAnnouncements } = api.announcement.listByCourse.useQuery(
    { courseId },
  );

  const create = api.announcement.create.useMutation({
    onSuccess: () => {
      void utils.announcement.listByCourse.invalidate({ courseId });
      form.resetFields();
      setShowForm(false);
      messageApi.success("Announcement posted!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const remove = api.announcement.delete.useMutation({
    onSuccess: () => {
      void utils.announcement.listByCourse.invalidate({ courseId });
      messageApi.success("Deleted.");
    },
    onError: (err) => messageApi.error(err.message),
  });

  return (
    <>
      {contextHolder}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowForm((v) => !v)}
        >
          New Announcement
        </Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 24 }}>
          <Form form={form} layout="vertical" onFinish={(v) => create.mutate({ courseId, ...v })}>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="content" label="Content" rules={[{ required: true }]}>
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={create.isPending}>
                  Post
                </Button>
                <Button onClick={() => setShowForm(false)}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        {announcements.length === 0 ? (
          <Card>
            <div style={{ textAlign: "center", padding: "24px 0", color: token.colorTextDisabled }}>
              <NotificationOutlined style={{ fontSize: 32, marginBottom: 8 }} />
              <div>No announcements yet.</div>
            </div>
          </Card>
        ) : (
          announcements.map((ann) => (
            <Card
              key={ann.id}
              title={ann.title}
              extra={
                <Popconfirm
                  title="Delete this announcement?"
                  onConfirm={() => remove.mutate({ id: ann.id })}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                </Popconfirm>
              }
            >
              <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 4 }}>
                {ann.content}
              </Typography.Paragraph>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(ann.createdAt).toLocaleString()}
              </Typography.Text>
            </Card>
          ))
        )}
      </Space>
    </>
  );
}
