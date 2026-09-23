"use client";

import { Alert, Col, Row, Spin } from "antd";
import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { BadgesList } from "~/components/gamification/BadgesList";
import { Leaderboard } from "~/components/gamification/Leaderboard";
import { PointsBadge } from "~/components/gamification/PointsBadge";
import { StreakWidget } from "~/components/gamification/StreakWidget";
import { PageHeader } from "~/components/ui/page-header";
import { useTRPC } from "~/trpc/react";

export default function GamificationPage() {
  const trpc = useTRPC();

  const {
    data: status,
    isLoading,
    error,
  } = useQuery(trpc.gamification.getMyStatus.queryOptions());

  const { data: leaderboard } = useQuery(
    trpc.gamification.getLeaderboard.queryOptions({
      scope: "global",
      limit: 10,
    }),
  );

  const recordLogin = useMutation(
    trpc.gamification.recordDailyLogin.mutationOptions(),
  );

  useEffect(() => {
    recordLogin.mutate();
  }, [recordLogin]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Loading achievements"
        style={{ display: "block", margin: "48px auto" }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Failed to load achievements"
        description={error.message}
        type="error"
        showIcon
      />
    );
  }

  if (!status) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Your Achievements"
        subtitle="Track points, badges, streaks, and leaderboard standing."
        marginBottom={24}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12} lg={8}>
          <PointsBadge points={status.points} level={status.level} />
        </Col>
        <Col xs={24} md={12} lg={8}>
          <StreakWidget
            currentStreak={status.currentStreak}
            longestStreak={status.longestStreak}
          />
        </Col>
      </Row>

      <div style={{ marginBottom: 24 }}>
        <BadgesList badges={status.badges} />
      </div>

      <Leaderboard
        entries={leaderboard?.entries ?? []}
        title="Global Leaderboard"
      />
    </div>
  );
}
