"use client";

import { Card, Col, Row, Skeleton } from "antd";

export default function Loading() {
  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} md={8}>
        <Card>
          <Skeleton active avatar={{ size: 96, shape: "circle" }} paragraph={{ rows: 2 }} />
        </Card>
      </Col>
      <Col xs={24} md={16}>
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      </Col>
    </Row>
  );
}
