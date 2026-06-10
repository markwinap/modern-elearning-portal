"use client";

import { Card, Col, Row, Skeleton } from "antd";

export default function Loading() {
  return (
    <div>
      <Skeleton.Input active size="large" style={{ width: 160, marginBottom: 24 }} />
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
}
