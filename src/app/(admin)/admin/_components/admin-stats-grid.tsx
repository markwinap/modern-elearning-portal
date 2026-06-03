"use client";

import { BookOutlined, SolutionOutlined, TeamOutlined } from "@ant-design/icons";
import { Card, Col, Row, Statistic } from "antd";

interface Props {
  stats: {
    users: number;
    courses: number;
    enrollments: number;
  };
}

export function AdminStatsGrid({ stats }: Props) {
  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Total Users"
            value={stats.users}
            prefix={<TeamOutlined />}
            styles={{ content: { color: "#4F46E5" } }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Total Courses"
            value={stats.courses}
            prefix={<BookOutlined />}
            styles={{ content: { color: "#059669" } }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Total Enrollments"
            value={stats.enrollments}
            prefix={<SolutionOutlined />}
            styles={{ content: { color: "#D97706" } }}
          />
        </Card>
      </Col>
    </Row>
  );
}
