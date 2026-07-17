import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { NotificationsList } from "./_components/notifications-list";

export const metadata: Metadata = {
  title: "Notifications | Modern E-Learning Portal",
  description: "Your recent notifications and updates",
};

export default async function NotificationsPage() {
  const notifications = await api.notification.getMyNotifications({
    unreadOnly: false,
  });
  return <NotificationsList initialNotifications={notifications} />;
}
