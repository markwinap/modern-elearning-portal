"use client";

import { Card, Skeleton, Table } from "antd";

export default function Loading() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Skeleton.Input active size="large" style={{ width: 120 }} />
        <Skeleton.Button active size="default" style={{ width: 130 }} />
      </div>
      <Card>
        <Table
          dataSource={Array.from({ length: 8 }, (_, i) => ({ key: i }))}
          columns={[
            { render: () => <Skeleton.Input active size="small" style={{ width: 220 }} /> },
            { render: () => <Skeleton.Input active size="small" style={{ width: 80 }} /> },
            { render: () => <Skeleton.Input active size="small" style={{ width: 100 }} /> },
            { render: () => <Skeleton.Button active size="small" style={{ width: 60 }} /> },
          ]}
          pagination={false}
        />
      </Card>
    </>
  );
}
