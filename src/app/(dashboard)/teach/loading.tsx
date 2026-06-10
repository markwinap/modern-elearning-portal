"use client";

import { Card, Skeleton, Table } from "antd";

export default function Loading() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Skeleton.Input active size="large" style={{ width: 160 }} />
        <Skeleton.Button active size="large" style={{ width: 140 }} />
      </div>
      <Card>
        <Table
          dataSource={Array.from({ length: 5 }, (_, i) => ({ key: i }))}
          columns={[
            {
              title: <Skeleton.Input active size="small" style={{ width: 60 }} />,
              render: () => <Skeleton.Input active size="small" style={{ width: 220 }} />,
            },
            {
              title: <Skeleton.Input active size="small" style={{ width: 60 }} />,
              render: () => <Skeleton.Input active size="small" style={{ width: 80 }} />,
            },
            {
              title: <Skeleton.Input active size="small" style={{ width: 60 }} />,
              render: () => (
                <div style={{ display: "flex", gap: 8 }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton.Button key={i} active size="small" style={{ width: 70 }} />
                  ))}
                </div>
              ),
            },
          ]}
          pagination={false}
        />
      </Card>
    </div>
  );
}
