"use client";

import { Tag } from "antd";

import { getStatusColor } from "~/lib/status";

interface Props {
  status: string;
}

export function StatusBadge({ status }: Props) {
  return <Tag color={getStatusColor(status)}>{status}</Tag>;
}
