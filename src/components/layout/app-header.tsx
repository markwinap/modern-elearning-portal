"use client";

import {
  BellOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Badge, Button, Dropdown, Layout, Space, theme } from "antd";
import type { MenuProps } from "antd";
import Text from "antd/es/typography/Text";
import { useRouter } from "next/navigation";

import { authClient } from "~/server/better-auth/client";
import { ThemeToggle } from "~/components/theme/theme-toggle";
import { api } from "~/trpc/react";

interface AppHeaderProps {
  userName: string;
  userImage?: string | null;
  unreadNotifications?: number;
}

export function AppHeader({
  userName,
  userImage,
  unreadNotifications = 0,
}: AppHeaderProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { token } = theme.useToken();
  const { data: unreadCount = unreadNotifications } =
    api.notification.getUnreadCount.useQuery(undefined, {
      initialData: unreadNotifications,
      refetchInterval: 15_000,
    });

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
      onClick: () => router.push("/profile"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "Settings",
      onClick: () => router.push("/settings"),
    },
    { type: "divider" },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Sign Out",
      danger: true,
      onClick: () => {
        void authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/");
              router.refresh();
            },
          },
        });
      },
    },
  ];

  return (
    <Layout.Header
      style={{
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 56,
        lineHeight: "56px",
      }}
    >
      <div />

      <Space size={8}>
        <ThemeToggle />
        <Badge count={unreadCount} size="small" overflowCount={99}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            aria-label={`Open notifications. ${unreadCount} unread.`}
            title="Notifications"
            onClick={() => router.push("/notifications")}
          />
        </Badge>

        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Space style={{ cursor: "pointer" }}>
            <Avatar
              src={userImage ?? undefined}
              icon={!userImage ? <UserOutlined /> : undefined}
              size={32}
              style={{ backgroundColor: token.colorPrimary }}
            />
            <Text>{session?.user?.name ?? userName}</Text>
          </Space>
        </Dropdown>
      </Space>
    </Layout.Header>
  );
}
