"use client";

import { Card, Skeleton, Table } from "antd";

export default function Loading() {
  return (
    <Card>
      <Table
        dataSource={Array.from({ length: 8 }, (_, i) => ({ key: i }))}
        columns={[
          { render: () => <Skeleton.Input active size="small" style={{ width: 200 }} /> },
          { render: () => <Skeleton.Input active size="small" style={{ width: 180 }} /> },
          { render: () => <Skeleton.Input active size="small" style={{ width: 80 }} /> },
          { render: () => <Skeleton.Button active size="small" style={{ width: 70 }} /> },
        ]}
        pagination={false}
      />
    </Card>
  );
}
