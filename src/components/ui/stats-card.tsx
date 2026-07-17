"use client";

import type { ReactNode } from "react";
import { Card, Statistic, theme } from "antd";

interface Props {
  title: string;
  value: string | number;
  prefix?: ReactNode;
  suffix?: string;
  color?: "primary" | "success" | "warning" | "error";
}

export function StatsCard({ title, value, prefix, suffix, color }: Props) {
  const { token } = theme.useToken();
  const colorMap = {
    primary: token.colorPrimary,
    success: token.colorSuccess,
    warning: token.colorWarning,
    error: token.colorError,
  };
  const colorValue = color ? colorMap[color] : undefined;

  return (
    <Card>
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        styles={colorValue ? { content: { color: colorValue } } : undefined}
      />
    </Card>
  );
}
