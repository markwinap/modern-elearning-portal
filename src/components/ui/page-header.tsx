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

const fontSizes: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 30,
  2: 24,
  3: 20,
  4: 18,
  5: 16,
};

export function PageHeader({
  title,
  level = 1,
  extra,
  subtitle,
  marginBottom = 24,
}: Props) {
  const Heading = (
    {
      1: "h1",
      2: "h2",
      3: "h3",
      4: "h4",
      5: "h5",
    } as const
  )[level];

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
        <Heading
          style={{
            margin: 0,
            fontSize: fontSizes[level],
            fontWeight: 600,
            lineHeight: 1.25,
            color: "inherit",
          }}
        >
          {title}
        </Heading>
        {subtitle ? (
          <Typography.Text type="secondary">{subtitle}</Typography.Text>
        ) : null}
      </div>
      {extra ? <div>{extra}</div> : null}
    </div>
  );
}
