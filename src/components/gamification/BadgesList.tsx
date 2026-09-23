"use client";

import type { ReactNode } from "react";
import {
  BookOutlined,
  DollarOutlined,
  FireOutlined,
  StarOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Card, Empty, Space, Tag, Typography } from "antd";

interface Badge {
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  awardedAt: Date;
}

interface Props {
  badges: Badge[];
}

const ICON_MAP: Record<string, ReactNode> = {
  StarOutlined: <StarOutlined />,
  TrophyOutlined: <TrophyOutlined />,
  BookOutlined: <BookOutlined />,
  FireOutlined: <FireOutlined />,
  DollarOutlined: <DollarOutlined />,
};

export function BadgesList({ badges }: Props) {
  if (badges.length === 0) {
    return (
      <Card title="Earned Badges">
        <Empty description="Complete activities to earn your first badge." />
      </Card>
    );
  }

  return (
    <Card title="Earned Badges">
      <Space size={[8, 8]} wrap>
        {badges.map((badge) => (
          <Tag
            key={badge.key}
            color="blue"
            icon={
              badge.icon ? (ICON_MAP[badge.icon] ?? <TrophyOutlined />) : null
            }
            style={{ padding: "6px 10px" }}
          >
            <Typography.Text strong>{badge.name}</Typography.Text>
            {badge.description ? (
              <Typography.Text type="secondary" style={{ marginLeft: 6 }}>
                {badge.description}
              </Typography.Text>
            ) : null}
          </Tag>
        ))}
      </Space>
    </Card>
  );
}
