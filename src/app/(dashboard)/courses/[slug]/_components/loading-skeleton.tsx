"use client";

import { Card, Skeleton, theme } from "antd";

export function LoadingSkeleton() {
  const { token } = theme.useToken();
  return (
    <div>
      <div
        style={{
          height: 280,
          background: token.colorFillSecondary,
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
