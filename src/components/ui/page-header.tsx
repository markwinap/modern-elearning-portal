"use client";

import type { ReactNode } from "react";
import { Typography } from "antd";

interface Props {
  title: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5;
  extra?: ReactNode;
  subtitle?: ReactNode;
  marginBottom?: number;
}

export function PageHeader({
  title,
  level = 2,
  extra,
  subtitle,
  marginBottom = 24,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        marginBottom,
      }}
    >
      <div>
        <Typography.Title level={level} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle ? (
          <Typography.Text type="secondary">{subtitle}</Typography.Text>
        ) : null}
      </div>
      {extra ? <div>{extra}</div> : null}
    </div>
  );
}
