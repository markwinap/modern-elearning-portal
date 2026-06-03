"use client";

import { Layout } from "antd";

import { AppHeader } from "~/components/layout/app-header";
import { AppSider } from "~/components/layout/app-sider";

interface Props {
  children: React.ReactNode;
  role: "student" | "teacher" | "admin";
  userName: string;
  userImage: string | null | undefined;
}

export function DashboardLayoutShell({ children, role, userName, userImage }: Props) {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppSider role={role} />
      <Layout style={{ flex: 1 }}>
        <AppHeader userName={userName} userImage={userImage} />
        <Layout.Content
          style={{
            padding: 24,
            background: "#f9fafb",
            minHeight: "calc(100vh - 56px)",
          }}
        >
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
