"use client";

import { Card, Col, Row, Skeleton } from "antd";

export default function Loading() {
  return (
    <div>
      <Skeleton.Input active size="large" style={{ marginBottom: 24, width: 200 }} />
      <Row gutter={[24, 24]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Col key={i} xs={24} sm={12} xl={8}>
            <Card>
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
