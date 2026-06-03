"use client";

import {
  BellOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Badge, Button, Dropdown, Layout, Space, Typography, theme } from "antd";
import type { MenuProps } from "antd";
import { useRouter } from "next/navigation";

import { authClient } from "~/server/better-auth/client";
import { ThemeToggle } from "~/components/theme/theme-toggle";

interface AppHeaderProps {
  userName: string;
  userImage?: string | null;
  unreadNotifications?: number;
}

export function AppHeader({ userName, userImage, unreadNotifications = 0 }: AppHeaderProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { token } = theme.useToken();

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
        <Badge count={unreadNotifications} size="small">
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            onClick={() => router.push("/notifications")}
          />
        </Badge>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
          <Space style={{ cursor: "pointer" }}>
            <Avatar
              src={userImage ?? undefined}
              icon={!userImage ? <UserOutlined /> : undefined}
              size={32}
              style={{ backgroundColor: "#4F46E5" }}
            />
            <Typography.Text>{session?.user?.name ?? userName}</Typography.Text>
          </Space>
        </Dropdown>
      </Space>
    </Layout.Header>
  );
}
