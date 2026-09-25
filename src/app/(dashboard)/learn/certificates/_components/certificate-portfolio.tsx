"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import Link from "next/link";

import { BadgeRenderer } from "~/components/certificates/badge-renderer";
import { useTRPC } from "~/trpc/react";

interface CertificateRow {
  id: number;
  serial: string;
  issuedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  courseTitle: string;
}

interface BadgeRow {
  id: number;
  uid: string;
  name: string;
  description: string | null;
  issuedOn: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

interface Props {
  certificates: CertificateRow[];
  badges: BadgeRow[];
}

export function CertificatePortfolio({ certificates, badges }: Props) {
  const trpc = useTRPC();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const renew = useMutation(
    trpc.certificate.renew.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
        void message.success("Certificate renewed");
      },
      onError: (error) => void message.error(error.message),
    }),
  );

  async function downloadSvg(serial: string) {
    const query = trpc.certificate.downloadSvg.queryOptions({ serial });
    const svg = await queryClient.fetchQuery(query);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${serial}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function status(row: CertificateRow | BadgeRow) {
    if (row.revokedAt) return <Tag color="red">Revoked</Tag>;
    if (row.expiresAt && row.expiresAt < new Date())
      return <Tag color="orange">Expired</Tag>;
    return <Tag color="green">Valid</Tag>;
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card title="Certificates">
        <Table
          rowKey="id"
          dataSource={certificates}
          pagination={false}
          columns={[
            { title: "Course", dataIndex: "courseTitle" },
            {
              title: "Issued",
              dataIndex: "issuedAt",
              render: (value: Date) => value.toLocaleDateString(),
            },
            {
              title: "Expires",
              dataIndex: "expiresAt",
              render: (value: Date | null) =>
                value ? value.toLocaleDateString() : "Never",
            },
            { title: "Status", render: (_, row) => status(row) },
            {
              title: "Actions",
              render: (_, row) => (
                <Space>
                  <Link href={`/certificate/${row.serial}`}>Verify</Link>
                  <Button size="small" onClick={() => void downloadSvg(row.serial)}>
                    Download SVG
                  </Button>
                  {row.expiresAt && row.expiresAt < new Date() && !row.revokedAt && (
                    <Button
                      size="small"
                      type="primary"
                      loading={renew.isPending}
                      onClick={() => renew.mutate({ serial: row.serial })}
                    >
                      Renew
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
        {certificates.length === 0 && (
          <Typography.Text type="secondary">
            No certificates yet. Complete a course to earn one.
          </Typography.Text>
        )}
      </Card>
      <Card title="Digital badges">
        <Space wrap size="large">
          {badges.map((badge) => (
            <BadgeRenderer key={badge.id} badge={badge} />
          ))}
          {badges.length === 0 && (
            <Typography.Text type="secondary">No badges yet.</Typography.Text>
          )}
        </Space>
      </Card>
    </Space>
  );
}
