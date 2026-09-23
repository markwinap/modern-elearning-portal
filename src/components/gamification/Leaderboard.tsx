"use client";

import { TrophyOutlined } from "@ant-design/icons";
import { Card, List, Tag, Typography } from "antd";

interface Entry {
  userId: string;
  name: string;
  points: number;
  rank: number;
}

interface Props {
  entries: Entry[];
  title?: string;
}

export function Leaderboard({ entries, title = "Leaderboard" }: Props) {
  return (
    <Card title={title}>
      <List
        dataSource={entries}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                item.rank <= 3 ? (
                  <Tag
                    color={
                      item.rank === 1
                        ? "gold"
                        : item.rank === 2
                          ? "silver"
                          : "bronze"
                    }
                    icon={<TrophyOutlined />}
                  >
                    #{item.rank}
                  </Tag>
                ) : (
                  <Typography.Text type="secondary">
                    #{item.rank}
                  </Typography.Text>
                )
              }
              title={item.name}
              description={
                <Typography.Text strong>
                  {item.points.toLocaleString()} pts
                </Typography.Text>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
