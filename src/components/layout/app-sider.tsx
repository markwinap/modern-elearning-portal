"use client";

import { useState } from "react";
import {
  BookOutlined,
  DashboardOutlined,
  MessageOutlined,
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Typography, theme } from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTheme } from "~/components/theme/theme-context";

type UserRole = "student" | "teacher" | "admin";

interface AppSiderProps {
  role: UserRole;
}

const studentItems: MenuProps["items"] = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: <Link href="/dashboard">Dashboard</Link>,
  },
  {
    key: "/courses",
    icon: <BookOutlined />,
    label: <Link href="/courses">Browse Courses</Link>,
  },
  {
    key: "/grades",
    icon: <TrophyOutlined />,
    label: <Link href="/grades">My Grades</Link>,
  },
  {
    key: "/messages",
    icon: <MessageOutlined />,
    label: <Link href="/messages">Messages</Link>,
  },
];

const teacherItems: MenuProps["items"] = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: <Link href="/dashboard">Dashboard</Link>,
  },
  {
    key: "/courses",
    icon: <BookOutlined />,
    label: <Link href="/courses">My Courses</Link>,
  },
  {
    key: "/teacher/courses/create",
    icon: <PlusOutlined />,
    label: <Link href="/teacher/courses/create">Create Course</Link>,
  },
  {
    key: "/messages",
    icon: <MessageOutlined />,
    label: <Link href="/messages">Messages</Link>,
  },
];

const adminItems: MenuProps["items"] = [
  {
    key: "/admin",
    icon: <DashboardOutlined />,
    label: <Link href="/admin">Overview</Link>,
  },
  {
    key: "/admin/users",
    icon: <TeamOutlined />,
    label: <Link href="/admin/users">Users</Link>,
  },
  {
    key: "/admin/categories",
    icon: <BookOutlined />,
    label: <Link href="/admin/categories">Categories</Link>,
  },
  {
    key: "/admin/courses",
    icon: <BookOutlined />,
    label: <Link href="/admin/courses">All Courses</Link>,
  },
  {
    key: "/admin/settings",
    icon: <SettingOutlined />,
    label: <Link href="/admin/settings">Settings</Link>,
  },
];

function getMenuItems(role: UserRole): MenuProps["items"] {
  if (role === "admin") return adminItems;
  if (role === "teacher") return teacherItems;
  return studentItems;
}

export function AppSider({ role }: AppSiderProps) {
  const pathname = usePathname();
  const { isDark } = useTheme();
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);

  const allKeys =
    getMenuItems(role)
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
            EduCore
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
        items={getMenuItems(role)}
        style={{ border: "none", paddingTop: 8 }}
      />
    </Layout.Sider>
  );
}
