"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Input, Select, Space, Table, Tag, Typography } from "antd";
import { useTRPC } from "~/trpc/react";
import { PageHeader } from "~/components/ui/page-header";

interface AuditLogRow {
  id: number;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

interface Props {
  initialLogs: AuditLogRow[];
  initialTotal: number;
  actions: string[];
  resourceTypes: string[];
}

export function AuditLogViewer({
  initialLogs,
  initialTotal,
  actions,
  resourceTypes,
}: Props) {
  const trpc = useTRPC();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    search: "",
  });
  const pageSize = 25;

  const { data, isLoading } = useQuery(
    trpc.audit.list.queryOptions(
      {
        page,
        limit: pageSize,
        action: filters.action || undefined,
        resourceType: filters.resourceType || undefined,
        search: filters.search || undefined,
      },
      {
        placeholderData: (previousData) =>
          previousData ?? { logs: initialLogs, total: initialTotal },
      },
    ),
  );

  const logs = data?.logs ?? initialLogs;
  const total = data?.total ?? initialTotal;

  const actionOptions = [
    { label: "All actions", value: "" },
    ...actions.map((a) => ({ label: a, value: a })),
  ];
  const resourceTypeOptions = [
    { label: "All resources", value: "" },
    ...resourceTypes.map((r) => ({ label: r, value: r })),
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <PageHeader
        level={1}
        title="Security & Audit Logs"
        subtitle="Review compliance-sensitive actions across the platform."
      />

      <Card>
        <Space wrap>
          <Select
            placeholder="Action"
            value={filters.action}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, action: value }))
            }
            options={actionOptions}
            style={{ minWidth: 180 }}
            allowClear
          />
          <Select
            placeholder="Resource type"
            value={filters.resourceType}
            onChange={(value) =>
              setFilters((prev) => ({ ...prev, resourceType: value }))
            }
            options={resourceTypeOptions}
            style={{ minWidth: 180 }}
            allowClear
          />
          <Input.Search
            placeholder="Search metadata"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            onSearch={(value) =>
              setFilters((prev) => ({ ...prev, search: value }))
            }
            style={{ minWidth: 240 }}
          />
        </Space>
      </Card>

      <Card>
        <Table
          rowKey={(row) => row.id}
          loading={isLoading}
          dataSource={logs}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: setPage,
          }}
          columns={[
            {
              title: "Time",
              dataIndex: "createdAt",
              render: (value: Date) => new Date(value).toLocaleString(),
            },
            {
              title: "Action",
              dataIndex: "action",
              render: (value: string) => <Tag>{value}</Tag>,
            },
            {
              title: "Actor",
              render: (_, row) =>
                row.actorName ? (
                  <span>{`${row.actorName} (${row.actorEmail})`}</span>
                ) : (
                  <Typography.Text type="secondary">System</Typography.Text>
                ),
            },
            {
              title: "Resource",
              render: (_, row) =>
                row.resourceType ? (
                  <span>{`${row.resourceType}:${row.resourceId}`}</span>
                ) : (
                  "—"
                ),
            },
            {
              title: "IP",
              dataIndex: "ipAddress",
              render: (value: string | null) => value ?? "—",
            },
            {
              title: "Metadata",
              dataIndex: "metadata",
              render: (value: Record<string, unknown>) => (
                <pre style={{ margin: 0, fontSize: 12 }}>
                  {JSON.stringify(value, null, 2)}
                </pre>
              ),
            },
          ]}
        />
      </Card>
    </Space>
  );
}
