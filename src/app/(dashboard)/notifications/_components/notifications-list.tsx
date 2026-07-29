"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { useState } from "react";
import {
  App,
  Button,
  Card,
  Empty,
  List,
  Space,
  Switch,
  Tag,
  theme,
} from "antd";
import Link from "next/link";

import { PageHeader } from "~/components/ui/page-header";

interface NotificationItem {
  id: number;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

interface Props {
  initialNotifications: NotificationItem[];
}

interface NotificationTemplate {
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function toTemplate(item: NotificationItem): NotificationTemplate {
  const payload = item.payload;
  const courseSlug = getString(payload.courseSlug);
  const courseTitle = getString(payload.courseTitle) ?? "this course";

  if (item.type === "announcement_posted") {
    const title = getString(payload.title) ?? "New announcement";
    return {
      title,
      body: `A new announcement was posted in ${courseTitle}.`,
      href: courseSlug ? `/courses/${courseSlug}` : undefined,
      hrefLabel: "Open course",
    };
  }

  if (item.type === "course_enrollment") {
    const courseId = getNumber(payload.courseId);
    return {
      title: "New student enrollment",
      body: `A student enrolled in ${courseTitle}.`,
      href:
        courseId !== undefined
          ? `/teach/courses/${courseId}/students`
          : "/teach",
      hrefLabel: "View students",
    };
  }

  if (item.type === "enrollment_status_changed") {
    const newStatus = getString(payload.newStatus) ?? "updated";
    return {
      title: "Enrollment status changed",
      body: `Your enrollment status is now ${newStatus} for ${courseTitle}.`,
      href: courseSlug ? `/courses/${courseSlug}` : undefined,
      hrefLabel: "Open course",
    };
  }

  if (item.type === "grade_posted") {
    const rawScore = getNumber(payload.rawScore);
    const maxScore = getNumber(payload.maxScore);
    const scoreLabel =
      rawScore !== undefined && maxScore !== undefined
        ? `Score: ${rawScore}/${maxScore}.`
        : "A new grade is available.";
    return {
      title: "Grade posted",
      body: `${scoreLabel} ${courseTitle}`,
      href: courseSlug ? `/courses/${courseSlug}` : undefined,
      hrefLabel: "Open course",
    };
  }

  if (item.type === "discussion_message") {
    const subject = getString(payload.subject) ?? "Discussion thread";
    return {
      title: "New discussion message",
      body: `New reply in "${subject}" for ${courseTitle}.`,
      href: courseSlug ? `/courses/${courseSlug}` : undefined,
      hrefLabel: "Open course",
    };
  }

  return {
    title: "Notification",
    body: "You have a new update.",
  };
}

export function NotificationsList({ initialNotifications }: Props) {
  const trpc = useTRPC();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { token } = theme.useToken();

  const { data: notifications = initialNotifications, isLoading } =
    useQuery(trpc.notification.getMyNotifications.queryOptions(
      { unreadOnly },
      {
        placeholderData: (previousData) => previousData ?? initialNotifications,
        refetchInterval: 20_000,
      },
    ));

  const markRead = useMutation(trpc.notification.markRead.mutationOptions({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.notification.getMyNotifications.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.notification.getUnreadCount.queryKey() }),
      ]);
    },
    onError: (error) => {
      message.error(error.message);
    },
  }));

  const markAllRead = useMutation(trpc.notification.markAllRead.mutationOptions({
    onSuccess: async () => {
      message.success("All notifications marked as read.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: trpc.notification.getMyNotifications.queryKey() }),
        queryClient.invalidateQueries({ queryKey: trpc.notification.getUnreadCount.queryKey() }),
      ]);
    },
    onError: (error) => {
      message.error(error.message);
    },
  }));

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Card>
        <PageHeader
          level={1}
          title="Notifications"
          subtitle={`${unreadCount} unread`}
          marginBottom={0}
          extra={
            <Space>
              <Space size={8}>
                <span>Unread only</span>
                <Switch checked={unreadOnly} onChange={setUnreadOnly} />
              </Space>
              <Button
                onClick={() => markAllRead.mutate()}
                loading={markAllRead.isPending}
                disabled={unreadCount === 0}
              >
                Mark all read
              </Button>
            </Space>
          }
        />
      </Card>

      <Card>
        {notifications.length === 0 && !isLoading ? (
          <Empty
            description="No notifications yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            loading={isLoading}
            dataSource={notifications}
            rowKey={(item) => item.id}
            renderItem={(item) => {
              const notification: NotificationItem = item;
              const template = toTemplate(notification);
              const isUnread = !notification.readAt;

              return (
                <List.Item
                  actions={[
                    template.href ? (
                      <Link key="view" href={template.href}>
                        {template.hrefLabel ?? "View"}
                      </Link>
                    ) : null,
                    isUnread ? (
                      <Button
                        key="read"
                        type="link"
                        onClick={() => markRead.mutate({ id: notification.id })}
                        loading={markRead.isPending}
                      >
                        Mark read
                      </Button>
                    ) : null,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{template.title}</span>
                        {isUnread ? (
                          <Tag color="processing">Unread</Tag>
                        ) : (
                          <Tag>Read</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space orientation="vertical" size={2}>
                        <span>{template.body}</span>
                        <span
                          style={{
                            color: token.colorTextTertiary,
                            fontSize: 12,
                          }}
                        >
                          {new Date(notification.createdAt).toLocaleString()}
                        </span>
                      </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
    </Space>
  );
}
