"use client";

import { Card, Divider, Skeleton } from "antd";

export default function Loading() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <Skeleton.Input active size="large" style={{ width: 220, marginBottom: 24 }} />
      <Card>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
            <Skeleton.Input active size="default" style={{ width: "100%" }} />
          </div>
        ))}
        <Divider />
        <Skeleton.Button active size="default" style={{ width: 120 }} />
      </Card>
    </div>
  );
}
