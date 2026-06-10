"use client";

import { Skeleton } from "antd";

export default function Loading() {
  return (
    <div>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid #d9d9d9",
            marginBottom: 8,
          }}
        >
          <Skeleton.Input active size="small" style={{ flex: 1 }} />
          <Skeleton.Button active size="small" style={{ width: 60 }} />
          <Skeleton.Button active size="small" style={{ width: 60 }} />
        </div>
      ))}
      <Skeleton.Button active size="default" block style={{ marginTop: 16 }} />
    </div>
  );
}
