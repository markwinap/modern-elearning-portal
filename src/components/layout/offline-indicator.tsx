"use client";

import { Alert } from "antd";

import { useOffline } from "~/hooks/useOffline";

export function OfflineIndicator() {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <Alert
      type="warning"
      showIcon
      message="You are offline. Cached pages and course content are still available."
      banner
      role="status"
      aria-live="polite"
      data-testid="offline-indicator"
    />
  );
}
