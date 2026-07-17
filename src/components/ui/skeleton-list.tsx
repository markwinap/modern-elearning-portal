"use client";

import { Card, Skeleton, Table } from "antd";

interface Props {
  titleWidth?: number;
  buttonWidth?: number;
  rowCount?: number;
}

export function ListSkeleton({
  titleWidth = 120,
  buttonWidth = 130,
  rowCount = 8,
}: Props) {
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
        <Skeleton.Input active size="large" style={{ width: titleWidth }} />
        <Skeleton.Button active size="medium" style={{ width: buttonWidth }} />
      </div>
      <Card>
        <Table
          dataSource={Array.from({ length: rowCount }, (_, i) => ({ key: i }))}
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
