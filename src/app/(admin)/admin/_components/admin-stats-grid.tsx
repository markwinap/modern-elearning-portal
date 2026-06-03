"use client";

import { BookOutlined, SolutionOutlined, TeamOutlined } from "@ant-design/icons";
import { Card, Col, Row, Statistic, theme } from "antd";

interface Props {
  stats: {
    users: number;
    courses: number;
    enrollments: number;
  };
}

export function AdminStatsGrid({ stats }: Props) {
  const { token } = theme.useToken();
  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Total Users"
            value={stats.users}
            prefix={<TeamOutlined />}
            styles={{ content: { color: token.colorPrimary } }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Total Courses"
            value={stats.courses}
            prefix={<BookOutlined />}
            styles={{ content: { color: token.colorSuccess } }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Total Enrollments"
            value={stats.enrollments}
            prefix={<SolutionOutlined />}
            styles={{ content: { color: token.colorWarning } }}
          />
        </Card>
      </Col>
    </Row>
  );
}
