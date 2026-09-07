"use client";

import {
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  NotificationOutlined,
} from "@ant-design/icons";
import { Badge, Button, Card, Col, List, Row, Space, Typography } from "antd";
import Link from "next/link";

import { CourseProgressCard } from "~/components/course/CourseProgressCard";
import { EmptyState } from "~/components/ui/empty-state";
import { PageHeader } from "~/components/ui/page-header";
import { gradientFromTitle } from "~/lib/gradient";
import type {
  ContinueLearningItem,
  DeadlineItem,
  AnnouncementItem,
} from "~/server/lib/dashboard";
import type { RecommendedCourse } from "~/server/lib/recommendations";

interface Props {
  userName: string;
  continueLearning: ContinueLearningItem[];
  upcomingDeadlines: DeadlineItem[];
  announcements: AnnouncementItem[];
  recommendations: RecommendedCourse[];
}

function formatDueDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function LearnerHome({
  userName,
  continueLearning,
  upcomingDeadlines,
  announcements,
  recommendations,
}: Props) {
  return (
    <div>
      <PageHeader
        title={`Welcome back, ${userName}`}
        subtitle="Pick up where you left off and stay on track."
        marginBottom={32}
      />

      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        <BookOutlined style={{ marginRight: 8 }} />
        Continue Learning
      </Typography.Title>
      {continueLearning.length === 0 ? (
        <div data-testid="continue-learning-section">
          <EmptyState
            icon={<BookOutlined />}
            title="No courses in progress"
            description="Browse the catalog and enroll in a course to get started."
            action={
              <Link href="/courses">
                <Button type="primary" icon={<BookOutlined />}>
                  Browse Courses
                </Button>
              </Link>
            }
          />
        </div>
      ) : (
        <Row
          data-testid="continue-learning-section"
          gutter={[16, 16]}
          style={{ marginBottom: 32 }}
        >
          {continueLearning.map((course) => (
            <Col key={course.courseId} xs={24} sm={12} lg={8}>
              <CourseProgressCard
                courseId={course.courseId}
                title={course.title}
                slug={course.slug}
                coverImageUrl={course.coverImageUrl}
                progressPct={course.progressPct}
              />
            </Col>
          ))}
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                Upcoming Deadlines
              </Space>
            }
          >
            {upcomingDeadlines.length === 0 ? (
              <EmptyState
                icon={<CalendarOutlined />}
                title="No upcoming deadlines"
                description="You have no deadlines in the next two weeks."
              />
            ) : (
              <List
                dataSource={upcomingDeadlines}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Link
                          href={
                            item.courseSlug
                              ? `/courses/${item.courseSlug}`
                              : "#"
                          }
                        >
                          {item.title}
                        </Link>
                      }
                      description={
                        <Space size={0} direction="vertical">
                          <Typography.Text type="secondary">
                            {item.courseTitle}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            {formatDueDate(item.dueAt)}
                            {item.meta ? ` · ${item.meta}` : null}
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

        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <NotificationOutlined />
                Announcements
              </Space>
            }
          >
            {announcements.length === 0 ? (
              <EmptyState
                icon={<NotificationOutlined />}
                title="No announcements"
                description="Check back later for updates from your courses."
              />
            ) : (
              <List
                dataSource={announcements}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Link
                          href={
                            item.courseSlug
                              ? `/courses/${item.courseSlug}/discussions`
                              : "#"
                          }
                        >
                          {item.title}
                        </Link>
                      }
                      description={
                        <Space size={0} direction="vertical">
                          <Typography.Text type="secondary">
                            {item.courseTitle}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            {new Date(item.createdAt).toLocaleDateString()}
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

      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Recommended for You
      </Typography.Title>
      {recommendations.length === 0 ? (
        <div data-testid="recommendations-section">
          <EmptyState
            icon={<BookOutlined />}
            title="No recommendations yet"
            description="Enroll in more courses to get personalized suggestions."
          />
        </div>
      ) : (
        <Row data-testid="recommendations-section" gutter={[16, 16]}>
          {recommendations.map((course) => (
            <Col key={course.id} xs={24} sm={12} lg={8}>
              <Link href={course.slug ? `/courses/${course.slug}` : "#"}>
                <Card
                  hoverable
                  cover={
                    <div
                      style={{
                        height: 120,
                        background: course.coverImageUrl
                          ? `url(${course.coverImageUrl}) center/cover`
                          : gradientFromTitle(course.title),
                      }}
                      role="img"
                      aria-label={course.title}
                    />
                  }
                  bodyStyle={{ padding: 16 }}
                >
                  <Typography.Text strong style={{ display: "block" }}>
                    {course.title}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {course.categoryName}
                  </Typography.Text>
                  {course.score > 0 ? (
                    <Badge
                      count={`${course.score}% match`}
                      style={{ backgroundColor: "#1677ff", marginTop: 8 }}
                    />
                  ) : null}
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
