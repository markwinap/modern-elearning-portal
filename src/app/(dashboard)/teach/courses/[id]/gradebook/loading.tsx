"use client";

import { Card, Skeleton, Table } from "antd";

export default function Loading() {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Skeleton.Input active size="small" style={{ width: 140 }} />
        <Skeleton.Button active size="medium" style={{ width: 120 }} />
      </div>
      <Card>
        <Table
          dataSource={Array.from({ length: 6 }, (_, i) => ({ key: i }))}
          columns={[
            {
              render: () => (
                <Skeleton.Input active size="small" style={{ width: 120 }} />
              ),
            },
            {
              render: () => (
                <Skeleton.Input active size="small" style={{ width: 80 }} />
              ),
            },
            {
              render: () => (
                <Skeleton.Input active size="small" style={{ width: 140 }} />
              ),
            },
            {
              render: () => (
                <Skeleton.Input active size="small" style={{ width: 200 }} />
              ),
            },
            {
              render: () => (
                <Skeleton.Input active size="small" style={{ width: 90 }} />
              ),
            },
          ]}
          pagination={false}
        />
      </Card>
    </>
  );
}
