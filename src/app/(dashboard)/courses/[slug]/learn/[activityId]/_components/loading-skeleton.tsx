"use client";

import { Card, Skeleton } from "antd";

export function LoadingSkeleton() {
  return (
    <Card>
      <Skeleton.Input active size="large" style={{ marginBottom: 16, width: 300 }} />
      <Skeleton active paragraph={{ rows: 8 }} />
    </Card>
  );
}
