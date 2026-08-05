"use client";

import {
  BellOutlined,
  BookOutlined,
  DashboardOutlined,
  MessageOutlined,
  SettingOutlined,
  TeamOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import Link from "next/link";

export type UserRole = "student" | "teacher" | "admin";

export const studentNavItems: MenuProps["items"] = [
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
  {
    key: "/notifications",
    icon: <BellOutlined />,
    label: <Link href="/notifications">Notifications</Link>,
  },
];

export const teacherNavItems: MenuProps["items"] = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: <Link href="/dashboard">Dashboard</Link>,
  },
  {
    key: "/teach",
    icon: <BookOutlined />,
    label: <Link href="/teach">All Courses</Link>,
  },
  {
    key: "/messages",
    icon: <MessageOutlined />,
    label: <Link href="/messages">Messages</Link>,
  },
  {
    key: "/notifications",
    icon: <BellOutlined />,
    label: <Link href="/notifications">Notifications</Link>,
  },
];

export const adminNavItems: MenuProps["items"] = [
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
  {
    key: "/notifications",
    icon: <BellOutlined />,
    label: <Link href="/notifications">Notifications</Link>,
  },
];

export function getNavItems(role: UserRole): MenuProps["items"] {
  if (role === "admin") return adminNavItems;
  if (role === "teacher") return teacherNavItems;
  return studentNavItems;
}
