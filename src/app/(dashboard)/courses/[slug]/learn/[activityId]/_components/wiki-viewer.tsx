"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Empty, List, Space, Typography } from "antd";

import { useTRPC, type RouterOutputs } from "~/trpc/react";
import { MarkdownPreview } from "~/components/ui/markdown-preview";

type WikiPage = RouterOutputs["wiki"]["listPages"][number];

interface Props {
  activityId: number;
}

export function WikiViewer({ activityId }: Props) {
  const trpc = useTRPC();
  const { data: pages = [] } = useQuery(
    trpc.wiki.listPages.queryOptions({ activityId }),
  );
  const [selected, setSelected] = useState<WikiPage | null>(pages[0] ?? null);

  return (
    <Card>
      {pages.length === 0 ? (
        <Empty description="No wiki pages yet." />
      ) : (
        <Space
          direction="vertical"
          style={{ width: "100%" }}
          size="large"
        >
          <List
            dataSource={pages}
            renderItem={(page) => (
              <List.Item
                style={{
                  cursor: "pointer",
                  background:
                    selected?.id === page.id ? "#f0f5ff" : "transparent",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
                onClick={() => setSelected(page)}
              >
                <Typography.Text strong={selected?.id === page.id}>
                  {page.title}
                </Typography.Text>
              </List.Item>
            )}
          />
          {selected ? (
            <Card
              title={
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {selected.title}
                </Typography.Title>
              }
            >
              <MarkdownPreview source={selected.content} />
            </Card>
          ) : (
            <Empty description="Select a page to read." />
          )}
        </Space>
      )}
    </Card>
  );
}
