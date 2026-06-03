"use client";

import {
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Tag,
  Typography,
} from "antd";
import { DownloadOutlined, FileOutlined } from "@ant-design/icons";

interface FileResource {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  forceDownload: boolean;
}

interface Props {
  file: FileResource | null;
  activityTitle: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileViewer({ file, activityTitle }: Props) {
  const { token } = theme.useToken();
  if (!file) {
    return (
      <Card>
        <Empty description="No file has been attached to this activity yet." />
      </Card>
    );
  }

  return (
    <Card>
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <FileOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {file.originalName}
            </Typography.Title>
            <Typography.Text type="secondary">{file.mimeType}</Typography.Text>
          </div>
        </div>

        <Descriptions column={2} size="small">
          <Descriptions.Item label="Size">{formatBytes(file.sizeBytes)}</Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag>{file.mimeType.split("/").pop()?.toUpperCase() ?? "FILE"}</Tag>
          </Descriptions.Item>
        </Descriptions>

        {/* In production, this would be a signed URL from your storage provider */}
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          href={`/api/files/${file.storageKey}`}
          target={file.forceDownload ? "_self" : "_blank"}
        >
          {file.forceDownload ? "Download File" : "Open File"}
        </Button>
      </Space>
    </Card>
  );
}
