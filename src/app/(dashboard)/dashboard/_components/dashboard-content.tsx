"use client";

import type { ReactNode } from "react";
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Typography } from "antd";

import { StatsCard } from "~/components/ui/stats-card";

interface Props {
  userName: string | null | undefined;
  stats:
    | {
        role: "student";
        enrolledCourses: number;
        completedActivities: number;
        hoursLearned: number;
        averageGrade: number | null;
      }
    | {
        role: "teacher";
        teachingCourses: number;
        publishedCourses: number;
        activeStudents: number;
        avgStudentsPerCourse: number;
      }
    | {
        role: "admin";
        users: number;
        courses: number;
        enrollments: number;
        completedActivities: number;
      };
}

interface DashboardCard {
  title: string;
  value: string | number;
  prefix: ReactNode;
  suffix?: string;
  color: "primary" | "success" | "warning" | "error";
}

export function DashboardContent({ userName, stats }: Props) {
  const cards: DashboardCard[] =
    stats.role === "student"
      ? [
          {
            title: "Enrolled Courses",
            value: stats.enrolledCourses,
            prefix: <BookOutlined />,
            color: "primary",
          },
          {
            title: "Completed Activities",
            value: stats.completedActivities,
            prefix: <CheckCircleOutlined />,
            color: "success",
          },
          {
            title: "Hours Learned",
            value: stats.hoursLearned,
            suffix: "h",
            prefix: <ClockCircleOutlined />,
            color: "warning",
          },
          {
            title: "Average Grade",
            value: stats.averageGrade ?? "—",
            suffix: stats.averageGrade !== null ? "%" : undefined,
            prefix: <TrophyOutlined />,
            color: "error",
          },
        ]
      : stats.role === "teacher"
        ? [
            {
              title: "Teaching Courses",
              value: stats.teachingCourses,
              prefix: <BookOutlined />,
              color: "primary",
            },
            {
              title: "Published Courses",
              value: stats.publishedCourses,
              prefix: <CheckCircleOutlined />,
              color: "success",
            },
            {
              title: "Active Students",
              value: stats.activeStudents,
              prefix: <ClockCircleOutlined />,
              color: "warning",
            },
            {
              title: "Avg Students / Course",
              value: stats.avgStudentsPerCourse,
              prefix: <TrophyOutlined />,
              color: "error",
            },
          ]
        : [
            {
              title: "Total Users",
              value: stats.users,
              prefix: <BookOutlined />,
              color: "primary",
            },
            {
              title: "Total Courses",
              value: stats.courses,
              prefix: <CheckCircleOutlined />,
              color: "success",
            },
            {
              title: "Total Enrollments",
              value: stats.enrollments,
              prefix: <ClockCircleOutlined />,
              color: "warning",
            },
            {
              title: "Completed Activities",
              value: stats.completedActivities,
              prefix: <TrophyOutlined />,
              color: "error",
            },
          ];

  return (
    <div>
      <Typography.Title level={3} style={{ marginBottom: 24 }}>
        Welcome back, {userName}
      </Typography.Title>

      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col key={card.title} xs={24} sm={12} lg={6}>
            <StatsCard
              title={card.title}
              value={card.value}
              suffix={card.suffix}
              prefix={card.prefix}
              color={card.color}
            />
          </Col>
        ))}
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
            <Typography.Text type="secondary">
              No recent activity.
            </Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
