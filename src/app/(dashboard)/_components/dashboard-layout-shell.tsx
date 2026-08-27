"use client";

import { Layout, theme } from "antd";

import { AppHeader } from "~/components/layout/app-header";
import { AppSider } from "~/components/layout/app-sider";
import { MobileBottomNav } from "~/components/layout/mobile-bottom-nav";
import { OfflineIndicator } from "~/components/layout/offline-indicator";

interface Props {
  children: React.ReactNode;
  role: "student" | "teacher" | "admin";
  userName: string;
  userImage: string | null | undefined;
  unreadNotifications: number;
}

export function DashboardLayoutShell({
  children,
  role,
  userName,
  userImage,
  unreadNotifications,
}: Props) {
  const { token } = theme.useToken();
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppSider userRole={role} />
      <Layout style={{ flex: 1 }}>
        <AppHeader
          userName={userName}
          userImage={userImage}
          unreadNotifications={unreadNotifications}
          userRole={role}
        />
        <OfflineIndicator />
        <Layout.Content
          className="dashboard-main-content"
          style={{
            padding: 24,
            paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))",
            background: token.colorBgLayout,
            minHeight: "calc(100vh - 56px)",
          }}
        >
          {children}
        </Layout.Content>
        <MobileBottomNav userRole={role} />
      </Layout>
    </Layout>
  );
}
