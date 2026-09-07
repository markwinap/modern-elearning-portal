"use client";

import {
  BellOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Layout,
  Menu,
  Space,
  Typography,
  theme,
} from "antd";
import type { MenuProps } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

import { authClient } from "~/server/better-auth/client";
import { ThemeToggle } from "~/components/theme/theme-toggle";
import { MobileDrawer } from "~/components/ui/mobile-drawer";
import { getMobileNavItems } from "~/lib/nav-config";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { GlobalSearch } from "~/components/search/GlobalSearch";

interface AppHeaderProps {
  userName: string;
  userImage?: string | null;
  unreadNotifications?: number;
  userRole: "student" | "teacher" | "admin";
}

export function AppHeader({
  userName,
  userImage,
  unreadNotifications = 0,
  userRole,
}: AppHeaderProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = theme.useToken();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const mobileNavItems = getMobileNavItems(userRole);
  const { data: unreadCount = unreadNotifications } = useQuery(
    trpc.notification.getUnreadCount.queryOptions(undefined, {
      initialData: unreadNotifications,
      refetchInterval: 15_000,
    }),
  );

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
      <Button
        type="text"
        className="mobile-menu-toggle"
        icon={<MenuOutlined />}
        aria-label="Open navigation menu"
        onClick={() => setMobileDrawerOpen(true)}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          padding: "0 16px",
        }}
      >
        <GlobalSearch />
      </div>

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
            <Typography.Text>{userName}</Typography.Text>
          </Space>
        </Dropdown>
      </Space>

      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title="Menu"
      >
        <Menu
          mode="inline"
          selectedKeys={[
            mobileNavItems.find(
              (item) =>
                pathname === item.href || pathname.startsWith(`${item.href}/`),
            )?.key ?? "",
          ]}
          items={mobileNavItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: (
              <Link href={item.href} onClick={() => setMobileDrawerOpen(false)}>
                {item.label}
              </Link>
            ),
          }))}
        />
      </MobileDrawer>
    </Layout.Header>
  );
}
