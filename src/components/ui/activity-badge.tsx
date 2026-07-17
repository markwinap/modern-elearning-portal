"use client";

import { Tag } from "antd";

import {
  getActivityTypeColor,
  getActivityTypeLabel,
} from "~/lib/activity-types";

interface Props {
  type: string;
}

export function ActivityBadge({ type }: Props) {
  return (
    <Tag color={getActivityTypeColor(type)}>
      {getActivityTypeLabel(type) ?? type}
    </Tag>
  );
}
