"use client";

import { Card, Skeleton } from "antd";

export default function Loading() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Skeleton.Input active size="large" style={{ width: 180 }} />
        <Skeleton.Button active size="default" style={{ width: 160 }} />
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <Card key={i} style={{ marginBottom: 12 }}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </Card>
      ))}
    </div>
  );
}
