"use client";

import { StarOutlined } from "@ant-design/icons";
import { Card, Statistic } from "antd";

interface Props {
  points: number;
  level: number;
}

export function PointsBadge({ points, level }: Props) {
  return (
    <Card>
      <Statistic
        title={`Level ${level}`}
        value={points}
        suffix="pts"
        prefix={<StarOutlined />}
      />
    </Card>
  );
}
