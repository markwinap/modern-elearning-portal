"use client";

import { Card, Col, Row, Skeleton } from "antd";

export function LoadingSkeleton() {
  return (
    <div>
      <Skeleton.Input active size="large" style={{ marginBottom: 24, width: 320 }} />
      <Row gutter={[24, 24]} style={{ marginTop: 8 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Col key={i} xs={24} sm={12} lg={8} xl={6}>
            <Card>
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
