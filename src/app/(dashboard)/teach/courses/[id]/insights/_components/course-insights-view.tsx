"use client";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { Card, Col, Progress, Row, Space, Statistic, Typography } from "antd";


interface Props {
  courseId: number;
}

export function CourseInsightsView({ courseId }: Props) {
  const trpc = useTRPC();
  const { data: insights, isLoading } = useQuery(trpc.course.getCourseInsights.queryOptions({
    courseId,
  }));
  const { data: totalDuration = 0 } = useQuery(trpc.section.getCourseDuration.queryOptions({
    courseId,
  }));

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={4}>Course Insights</Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Enrolled Students"
              value={insights?.enrollmentCount ?? 0}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completed"
              value={insights?.completedCount ?? 0}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Completion Rate"
              value={
                insights ? (insights.completionRate * 100).toFixed(1) : "—"
              }
              suffix="%"
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Duration"
              value={totalDuration}
              suffix="min"
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title="Average Progress">
            <Progress
              type="dashboard"
              percent={Math.round(insights?.averageProgress ?? 0)}
              status="active"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title="Average Grade">
            <Progress
              type="dashboard"
              percent={Math.round(insights?.averageGrade ?? 0)}
              status="active"
              strokeColor={
                (insights?.averageGrade ?? 0) >= 60 ? "#52c41a" : "#ff4d4f"
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Grade Distribution */}
      {insights?.gradeDistribution && (
        <Card title="Grade Distribution">
          <Row gutter={8} align="bottom">
            {insights.gradeDistribution.map((bucket) => (
              <Col key={bucket.bucket} flex={1} style={{ textAlign: "center" }}>
                <div
                  style={{
                    height: Math.max(20, bucket.count * 24),
                    background: "#1677ff",
                    borderRadius: 4,
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 12,
                    minWidth: 32,
                  }}
                >
                  {bucket.count}
                </div>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {bucket.bucket}–{bucket.bucket + 20}%
                </Typography.Text>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </Space>
  );
}
