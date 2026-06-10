"use client";

import { Card, Skeleton, Space } from "antd";

export default function Loading() {
  return (
    <Space orientation="vertical" style={{ width: "100%" }} size="large">
      {/* Header bar: back arrow + title + type tag */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Skeleton.Avatar
          active
          size="small"
          shape="square"
          style={{ width: 20, height: 20 }}
        />
        <Skeleton.Input active size="default" style={{ width: 240 }} />
        <Skeleton.Input active size="small" style={{ width: 64 }} />
      </div>

      {/* Main content card */}
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </Space>
  );
}
