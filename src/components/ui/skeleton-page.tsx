"use client";

import { Card, Col, Row, Skeleton } from "antd";

interface Props {
  titleWidth?: number;
  statCount?: number;
  contentRows?: number;
}

export function PageSkeleton({
  titleWidth = 160,
  statCount = 4,
  contentRows = 6,
}: Props) {
  return (
    <div>
      <Skeleton.Input
        active
        size="large"
        style={{ width: titleWidth, marginBottom: 24 }}
      />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {Array.from({ length: statCount }, (_, i) => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card>
        <Skeleton active paragraph={{ rows: contentRows }} />
      </Card>
    </div>
  );
}
