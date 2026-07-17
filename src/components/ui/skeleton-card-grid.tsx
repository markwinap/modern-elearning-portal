"use client";

import { Card, Col, Row, Skeleton } from "antd";

interface Props {
  titleWidth?: number;
  cardCount?: number;
  rows?: number;
}

export function CardGridSkeleton({
  titleWidth = 160,
  cardCount = 4,
  rows = 3,
}: Props) {
  return (
    <div>
      <Skeleton.Input
        active
        size="large"
        style={{ width: titleWidth, marginBottom: 24 }}
      />
      <Row gutter={[24, 24]}>
        {Array.from({ length: cardCount }, (_, i) => (
          <Col key={i} xs={24} sm={12} xl={8}>
            <Card>
              <Skeleton active paragraph={{ rows }} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
