"use client";

import type { ReactNode } from "react";
import { Typography, theme } from "antd";

interface Props {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  const { token } = theme.useToken();
  return (
    <div style={{ textAlign: "center", padding: "64px 0" }}>
      <div
        style={{
          fontSize: 48,
          color: token.colorTextDisabled,
          marginBottom: 16,
        }}
      >
        {icon}
      </div>
      <Typography.Title level={4} type="secondary">
        {title}
      </Typography.Title>
      {description ? (
        <Typography.Text type="secondary">{description}</Typography.Text>
      ) : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}
