"use client";

import { useState } from "react";
import { Layout, Menu, Typography, theme } from "antd";
import { usePathname } from "next/navigation";

import { useTheme } from "~/components/theme/theme-context";
import { getNavItems, type UserRole } from "~/lib/nav-config";

interface AppSiderProps {
  role: UserRole;
}

export function AppSider({ role }: AppSiderProps) {
  const pathname = usePathname();
  const { isDark } = useTheme();
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);

  const allKeys =
    getNavItems(role)
      ?.map((item) => item?.key as string)
      .filter(Boolean) ?? [];

  const selectedKey =
    allKeys
      .sort((a, b) => b.length - a.length)
      .find((key) => pathname.startsWith(key)) ?? "";

  return (
    <Layout.Sider
      theme={isDark ? "dark" : "light"}
      width={220}
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      breakpoint="lg"
      onBreakpoint={(broken) => setCollapsed(broken)}
      style={{
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        minHeight: "100vh",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
      }}
    >
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          paddingLeft: collapsed ? 0 : 24,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          overflow: "hidden",
          transition: "padding 0.2s",
        }}
      >
        {!collapsed && (
          <Typography.Text
            strong
            style={{
              fontSize: 18,
              color: token.colorPrimary,
              whiteSpace: "nowrap",
            }}
          >
            Modern E-Learning Portal
          </Typography.Text>
        )}
        {collapsed && (
          <Typography.Text
            strong
            style={{ fontSize: 18, color: token.colorPrimary }}
          >
            E
          </Typography.Text>
        )}
      </div>
      <Menu
        theme={isDark ? "dark" : "light"}
        mode="inline"
        selectedKeys={[selectedKey]}
        items={getNavItems(role)}
        style={{ border: "none", paddingTop: 8 }}
      />
    </Layout.Sider>
  );
}
