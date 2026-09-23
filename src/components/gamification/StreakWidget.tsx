"use client";

import { FireOutlined, TrophyOutlined } from "@ant-design/icons";
import { Card, Space, Statistic, Typography } from "antd";

interface Props {
  currentStreak: number;
  longestStreak: number;
}

export function StreakWidget({ currentStreak, longestStreak }: Props) {
  return (
    <Card>
      <Space direction="vertical" style={{ display: "flex" }}>
        <Statistic
          title="Current Streak"
          value={currentStreak}
          suffix="days"
          prefix={<FireOutlined style={{ color: "#fa541c" }} />}
        />
        <Typography.Text type="secondary">
          <TrophyOutlined style={{ marginRight: 4 }} />
          Longest streak: {longestStreak} days
        </Typography.Text>
      </Space>
    </Card>
  );
}
