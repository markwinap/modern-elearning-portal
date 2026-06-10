"use client";

import { Card, Col, Row, Skeleton } from "antd";

export default function Loading() {
  return (
    <div>
      <Skeleton.Input active size="large" style={{ width: 280, marginBottom: 24 }} />

      <Row gutter={[16, 16]}>
        {Array.from({ length: 4 }, (_, i) => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Card>
              <Skeleton active paragraph={{ rows: 1 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card style={{ minHeight: 240 }}>
            <Skeleton active paragraph={{ rows: 5 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card style={{ minHeight: 240 }}>
            <Skeleton active paragraph={{ rows: 5 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
