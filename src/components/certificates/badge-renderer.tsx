"use client";

import { Card, Tag, Typography } from "antd";
import { TrophyOutlined } from "@ant-design/icons";
import Link from "next/link";

interface Badge {
  uid: string;
  name: string;
  description: string | null;
  issuedOn: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

export function BadgeRenderer({ badge }: { badge: Badge }) {
  const expired = badge.expiresAt !== null && badge.expiresAt < new Date();
  return (
    <Card size="small" style={{ width: 280 }}>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        <TrophyOutlined /> {badge.name}
      </Typography.Title>
      {badge.description && (
        <Typography.Paragraph type="secondary" style={{ minHeight: 40 }}>
          {badge.description}
        </Typography.Paragraph>
      )}
      <Typography.Text type="secondary" style={{ display: "block" }}>
        Issued {badge.issuedOn.toLocaleDateString()}
      </Typography.Text>
      {badge.revokedAt ? (
        <Tag color="red">Revoked</Tag>
      ) : expired ? (
        <Tag color="orange">Expired</Tag>
      ) : (
        <Tag color="green">Valid</Tag>
      )}
      <Link href={`/badge/${badge.uid}`}>Verify</Link>
    </Card>
  );
}
