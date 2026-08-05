"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Card, Col, List, Progress, Row, Space, Typography } from "antd";

import { StatsCard } from "~/components/ui/stats-card";

interface CourseSummary {
  courseId: number;
  title: string;
  slug: string | null;
  coverImageUrl: string | null;
  status: string;
  progressPct: number;
  completedAt: Date | null;
}

interface ActivitySummary {
  id: number;
  activityId: number;
  status: string;
  firstViewedAt: Date | null;
  completedAt: Date | null;
  timeSpentSecs: number;
  activityTitle: string;
  courseTitle: string;
  courseSlug: string | null;
}

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
  courses: CourseSummary[];
  recent: ActivitySummary[];
}

interface DashboardCard {
  title: string;
  value: string | number;
  prefix: ReactNode;
  suffix?: string;
  color: "primary" | "success" | "warning" | "error";
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${secs}s`;
}

export function DashboardContent({ userName, stats, courses, recent }: Props) {
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

      {stats.role === "student" && (
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={16}>
            <Card title="My Courses" style={{ minHeight: 240 }}>
              {courses.length === 0 ? (
                <Typography.Text type="secondary">
                  You are not enrolled in any courses yet.
                </Typography.Text>
              ) : (
                <List
                  dataSource={courses}
                  renderItem={(course) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Link
                            href={`/courses/${course.slug ?? course.courseId}`}
                          >
                            {course.title}
                          </Link>
                        }
                        description={
                          <Progress percent={course.progressPct} size="small" />
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Recent Activity" style={{ minHeight: 240 }}>
              {recent.length === 0 ? (
                <Typography.Text type="secondary">
                  No recent activity.
                </Typography.Text>
              ) : (
                <List
                  dataSource={recent}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Link
                            href={
                              item.courseSlug
                                ? `/courses/${item.courseSlug}/learn/${item.activityId}`
                                : "#"
                            }
                          >
                            {item.activityTitle}
                          </Link>
                        }
                        description={
                          <Space orientation="vertical" size={0}>
                            <Typography.Text type="secondary">
                              {item.courseTitle}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              {item.status === "completed"
                                ? "Completed"
                                : "In progress"}
                              {" · "}
                              {formatDuration(item.timeSpentSecs)}
                            </Typography.Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
