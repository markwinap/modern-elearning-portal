"use client";

import { Card, Skeleton } from "antd";

export function LoadingSkeleton() {
  return (
    <div>
      <div
        style={{
          height: 280,
          background: "#e5e7eb",
          borderRadius: 8,
          marginBottom: 24,
        }}
      />
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}
