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

import { DeleteOutlined } from "@ant-design/icons";
import { PageHeader } from "~/components/ui/page-header";
import {
  notificationToTemplate,
  type NotificationType,
} from "~/lib/notifications";

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

function toTemplate(item: NotificationItem) {
  return notificationToTemplate(item.type as NotificationType, item.payload);
}

export function NotificationsList({ initialNotifications }: Props) {
  const trpc = useTRPC();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { token } = theme.useToken();

  const { data: notifications = initialNotifications, isLoading } = useQuery(
    trpc.notification.getMyNotifications.queryOptions(
      { unreadOnly },
      {
        placeholderData: (previousData) => previousData ?? initialNotifications,
        refetchInterval: 20_000,
      },
    ),
  );

  const markRead = useMutation(
    trpc.notification.markRead.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.notification.getMyNotifications.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.notification.getUnreadCount.queryKey(),
          }),
        ]);
      },
      onError: (error) => {
        message.error(error.message);
      },
    }),
  );

  const markAllRead = useMutation(
    trpc.notification.markAllRead.mutationOptions({
      onSuccess: async () => {
        message.success("All notifications marked as read.");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.notification.getMyNotifications.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.notification.getUnreadCount.queryKey(),
          }),
        ]);
      },
      onError: (error) => {
        message.error(error.message);
      },
    }),
  );

  const deleteNotification = useMutation(
    trpc.notification.delete.mutationOptions({
      onMutate: async ({ id }) => {
        const queryKey = trpc.notification.getMyNotifications.queryKey();
        await queryClient.cancelQueries({ queryKey });
        const previous =
          queryClient.getQueryData<NotificationItem[]>(queryKey) ??
          notifications;
        const removed = previous.find((n) => n.id === id);
        queryClient.setQueryData<NotificationItem[]>(queryKey, (old) =>
          (old ?? previous).filter((n) => n.id !== id),
        );
        const previousUnreadCount = queryClient.getQueryData<number>(
          trpc.notification.getUnreadCount.queryKey(),
        );
        if (removed && !removed.readAt) {
          queryClient.setQueryData<number>(
            trpc.notification.getUnreadCount.queryKey(),
            (old) => Math.max(0, (old ?? previousUnreadCount ?? 0) - 1),
          );
        }
        return { previous, previousUnreadCount };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            trpc.notification.getMyNotifications.queryKey(),
            context.previous,
          );
        }
        if (context?.previousUnreadCount !== undefined) {
          queryClient.setQueryData(
            trpc.notification.getUnreadCount.queryKey(),
            context.previousUnreadCount,
          );
        }
        message.error(error.message);
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.notification.getMyNotifications.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.notification.getUnreadCount.queryKey(),
          }),
        ]);
      },
    }),
  );

  const deleteAllRead = useMutation(
    trpc.notification.deleteAllRead.mutationOptions({
      onMutate: async () => {
        const queryKey = trpc.notification.getMyNotifications.queryKey();
        await queryClient.cancelQueries({ queryKey });
        const previous =
          queryClient.getQueryData<NotificationItem[]>(queryKey) ??
          notifications;
        queryClient.setQueryData<NotificationItem[]>(queryKey, (old) =>
          (old ?? previous).filter((n) => !n.readAt),
        );
        const previousUnreadCount = queryClient.getQueryData<number>(
          trpc.notification.getUnreadCount.queryKey(),
        );
        return { previous, previousUnreadCount };
      },
      onError: (error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(
            trpc.notification.getMyNotifications.queryKey(),
            context.previous,
          );
        }
        if (context?.previousUnreadCount !== undefined) {
          queryClient.setQueryData(
            trpc.notification.getUnreadCount.queryKey(),
            context.previousUnreadCount,
          );
        }
        message.error(error.message);
      },
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.notification.getMyNotifications.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.notification.getUnreadCount.queryKey(),
          }),
        ]);
      },
    }),
  );

  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const readCount = notifications.filter((item) => item.readAt).length;

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
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  modal.confirm({
                    title: "Clear read notifications?",
                    content:
                      "All notifications marked as read will be permanently removed.",
                    onOk: () => deleteAllRead.mutate(),
                  })
                }
                loading={deleteAllRead.isPending}
                disabled={readCount === 0}
              >
                Clear read
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
                    <Button
                      key="delete"
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        deleteNotification.mutate({ id: notification.id })
                      }
                      loading={
                        deleteNotification.isPending &&
                        deleteNotification.variables?.id === notification.id
                      }
                    >
                      Delete
                    </Button>,
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
