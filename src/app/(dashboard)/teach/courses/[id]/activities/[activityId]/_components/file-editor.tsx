"use client";

import { Button, Card, Checkbox, Form, Input, InputNumber, Space, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

interface FileData {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  forceDownload: boolean;
}

interface Props {
  activityId: number;
  initialData: FileData | null;
}

interface FormValues {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  forceDownload: boolean;
}

export function FileEditor({ activityId, initialData }: Props) {
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const utils = api.useUtils();

  const upsert = api.file.upsert.useMutation({
    onSuccess: () => {
      void utils.file.getByActivity.invalidate({ activityId });
      messageApi.success("File resource saved!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  return (
    <>
      {contextHolder}
      <Card title={<Typography.Text strong>File Resource</Typography.Text>}>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Configure the file resource metadata. The storage key is the path or identifier used to retrieve the file.
          </Typography.Text>
          <Form
            form={form}
            layout="vertical"
            initialValues={
              initialData ?? {
                storageKey: "",
                originalName: "",
                mimeType: "application/octet-stream",
                sizeBytes: 0,
                forceDownload: false,
              }
            }
            onFinish={(values) => upsert.mutate({ activityId, ...values })}
          >
            <Form.Item
              name="storageKey"
              label="Storage Key / URL"
              rules={[{ required: true, message: "Storage key is required" }]}
            >
              <Input placeholder="e.g. uploads/course-1/document.pdf" />
            </Form.Item>
            <Form.Item
              name="originalName"
              label="File Name"
              rules={[{ required: true, message: "File name is required" }]}
            >
              <Input placeholder="e.g. lecture-notes.pdf" />
            </Form.Item>
            <Form.Item
              name="mimeType"
              label="MIME Type"
              rules={[{ required: true }]}
            >
              <Input placeholder="e.g. application/pdf" />
            </Form.Item>
            <Form.Item
              name="sizeBytes"
              label="File Size (bytes)"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="forceDownload" valuePropName="checked">
              <Checkbox>Force download (disable browser preview)</Checkbox>
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
