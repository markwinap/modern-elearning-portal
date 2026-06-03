"use client";

import { Button, Card, Form, Input, Select, Space, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

const OPEN_MODE_OPTIONS = [
  { value: "new_tab", label: "Open in new tab" },
  { value: "same_tab", label: "Open in same tab" },
  { value: "modal", label: "Open in modal popup" },
];

interface UrlData {
  url: string;
  label: string | null;
  description: string | null;
  openMode: string;
}

interface Props {
  activityId: number;
  initialData: UrlData | null;
}

interface FormValues {
  url: string;
  label: string;
  description: string;
  openMode: "same_tab" | "new_tab" | "modal";
}

export function UrlEditor({ activityId, initialData }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const utils = api.useUtils();

  const upsert = api.url.upsert.useMutation({
    onSuccess: () => {
      void utils.url.getByActivity.invalidate({ activityId });
      messageApi.success("URL resource saved!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  return (
    <>
      {contextHolder}
      <Card title={<Typography.Text strong>URL Resource</Typography.Text>}>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={
              initialData
                ? {
                  url: initialData.url,
                  label: initialData.label ?? "",
                  description: initialData.description ?? "",
                  openMode: initialData.openMode ?? "new_tab",
                }
                : { openMode: "new_tab" }
            }
            onFinish={(values) =>
              upsert.mutate({
                activityId,
                url: values.url,
                label: values.label || undefined,
                description: values.description || undefined,
                openMode: values.openMode,
              })
            }
          >
            <Form.Item
              name="url"
              label="URL"
              rules={[
                { required: true, message: "URL is required" },
                { type: "url", message: "Enter a valid URL" },
              ]}
            >
              <Input placeholder="https://example.com/resource" />
            </Form.Item>
            <Form.Item name="label" label="Link Label">
              <Input placeholder="Optional display label" />
            </Form.Item>
            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} placeholder="Optional description shown to students" />
            </Form.Item>
            <Form.Item name="openMode" label="Open Mode" rules={[{ required: true }]}>
              <Select options={OPEN_MODE_OPTIONS} style={{ width: 240 }} />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={upsert.isPending}
              >
                Save
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </>
  );
}
