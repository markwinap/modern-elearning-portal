"use client";

import {
  BookOutlined,
  DashboardOutlined,
  MessageOutlined,
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Layout, Menu, Typography } from "antd";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
      theme="light"
      width={220}
      style={{
        borderRight: "1px solid #f0f0f0",
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
          paddingLeft: 24,
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Typography.Text strong style={{ fontSize: 18, color: "#4F46E5" }}>
          EduCore
        </Typography.Text>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={getMenuItems(role)}
        style={{ border: "none", paddingTop: 8 }}
      />
    </Layout.Sider>
  );
}
