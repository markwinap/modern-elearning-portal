"use client";

import {
  BookOutlined,
  SolutionOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Col, Row } from "antd";

import { StatsCard } from "~/components/ui/stats-card";

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
        <StatsCard
          title="Total Users"
          value={stats.users}
          prefix={<TeamOutlined />}
          color="primary"
        />
      </Col>
      <Col xs={24} sm={8}>
        <StatsCard
          title="Total Courses"
          value={stats.courses}
          prefix={<BookOutlined />}
          color="success"
        />
      </Col>
      <Col xs={24} sm={8}>
        <StatsCard
          title="Total Enrollments"
          value={stats.enrollments}
          prefix={<SolutionOutlined />}
          color="warning"
        />
      </Col>
    </Row>
  );
}
