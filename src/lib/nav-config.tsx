"use client";

import {
  BellOutlined,
  BookOutlined,
  DashboardOutlined,
  MessageOutlined,
  SafetyOutlined,
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
    key: "/learn/gamification",
    icon: <TrophyOutlined />,
    label: <Link href="/learn/gamification">Achievements</Link>,
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
    key: "/admin/gamification",
    icon: <TrophyOutlined />,
    label: <Link href="/admin/gamification">Gamification</Link>,
  },
  {
    key: "/admin/security",
    icon: <SafetyOutlined />,
    label: <Link href="/admin/security">Security</Link>,
  },
  {
    key: "/notifications",
    icon: <BellOutlined />,
    label: <Link href="/notifications">Notifications</Link>,
  },
];

export interface MobileNavItem {
  key: string;
  href: string;
  label: string;
  icon: React.ReactNode;
}

export const studentMobileNavItems: MobileNavItem[] = [
  {
    key: "/dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: <DashboardOutlined />,
  },
  {
    key: "/courses",
    href: "/courses",
    label: "Browse",
    icon: <BookOutlined />,
  },
  {
    key: "/grades",
    href: "/grades",
    label: "Grades",
    icon: <TrophyOutlined />,
  },
  {
    key: "/learn/gamification",
    href: "/learn/gamification",
    label: "Achieve",
    icon: <TrophyOutlined />,
  },
  {
    key: "/messages",
    href: "/messages",
    label: "Messages",
    icon: <MessageOutlined />,
  },
  {
    key: "/notifications",
    href: "/notifications",
    label: "Alerts",
    icon: <BellOutlined />,
  },
];

export const teacherMobileNavItems: MobileNavItem[] = [
  {
    key: "/dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: <DashboardOutlined />,
  },
  { key: "/teach", href: "/teach", label: "Courses", icon: <BookOutlined /> },
  {
    key: "/messages",
    href: "/messages",
    label: "Messages",
    icon: <MessageOutlined />,
  },
  {
    key: "/notifications",
    href: "/notifications",
    label: "Alerts",
    icon: <BellOutlined />,
  },
];

export const adminMobileNavItems: MobileNavItem[] = [
  {
    key: "/admin",
    href: "/admin",
    label: "Overview",
    icon: <DashboardOutlined />,
  },
  {
    key: "/admin/users",
    href: "/admin/users",
    label: "Users",
    icon: <TeamOutlined />,
  },
  {
    key: "/admin/courses",
    href: "/admin/courses",
    label: "Courses",
    icon: <BookOutlined />,
  },
  {
    key: "/admin/gamification",
    href: "/admin/gamification",
    label: "Gamify",
    icon: <TrophyOutlined />,
  },
  {
    key: "/notifications",
    href: "/notifications",
    label: "Alerts",
    icon: <BellOutlined />,
  },
];

export function getNavItems(role: UserRole): MenuProps["items"] {
  if (role === "admin") return adminNavItems;
  if (role === "teacher") return teacherNavItems;
  return studentNavItems;
}

export function getMobileNavItems(role: UserRole): MobileNavItem[] {
  if (role === "admin") return adminMobileNavItems;
  if (role === "teacher") return teacherMobileNavItems;
  return studentMobileNavItems;
}
