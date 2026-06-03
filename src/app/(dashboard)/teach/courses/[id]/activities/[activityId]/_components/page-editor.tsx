"use client";

import { useState } from "react";
import { Button, Card, Input, Space, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

interface Props {
  activityId: number;
  initialContent: string;
}

export function PageEditor({ activityId, initialContent }: Props) {
  const [content, setContent] = useState(initialContent);
  const [messageApi, contextHolder] = message.useMessage();
  const utils = api.useUtils();

  const upsert = api.page.upsert.useMutation({
    onSuccess: () => {
      void utils.page.getByActivity.invalidate({ activityId });
      messageApi.success("Page content saved!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  return (
    <>
      {contextHolder}
      <Card
        title={<Typography.Text strong>Page Content</Typography.Text>}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={upsert.isPending}
            onClick={() => upsert.mutate({ activityId, content })}
          >
            Save
          </Button>
        }
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Write the page content below. HTML and Markdown are supported.
          </Typography.Text>
          <Input.TextArea
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter page content here…"
            style={{ fontFamily: "monospace", fontSize: 13 }}
          />
        </Space>
      </Card>
    </>
  );
}
