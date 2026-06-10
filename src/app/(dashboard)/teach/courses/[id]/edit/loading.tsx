"use client";

import { Card, Divider, Skeleton } from "antd";

export default function Loading() {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Skeleton.Input active size="small" style={{ width: 80 }} />
        <Skeleton.Button active size="medium" style={{ width: 100 }} />
      </div>
      <Card>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} style={{ marginBottom: 24 }}>
            <Skeleton.Input
              active
              size="small"
              style={{ width: 120, marginBottom: 8 }}
            />
            <Skeleton.Input active size="default" style={{ width: "100%" }} />
          </div>
        ))}
        <Divider />
        <Skeleton.Button active size="medium" style={{ width: 120 }} />
      </Card>
    </>
  );
}
