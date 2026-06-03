"use client";

import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Statistic, Typography } from "antd";

interface Props {
  userName: string | null | undefined;
}

export function DashboardContent({ userName }: Props) {
  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Welcome back, {userName}
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Enrolled Courses"
              value={0}
              prefix={<BookOutlined style={{ color: "#4F46E5" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Completed Activities"
              value={0}
              prefix={<CheckCircleOutlined style={{ color: "#10b981" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Hours Learned"
              value={0}
              suffix="h"
              prefix={<ClockCircleOutlined style={{ color: "#f59e0b" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Average Grade"
              value="—"
              prefix={<TrophyOutlined style={{ color: "#ef4444" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="My Courses" style={{ minHeight: 240 }}>
            <Typography.Text type="secondary">
              You are not enrolled in any courses yet.
            </Typography.Text>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Recent Activity" style={{ minHeight: 240 }}>
            <Typography.Text type="secondary">No recent activity.</Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
