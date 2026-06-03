"use client";

import { Layout, theme } from "antd";

import { AppHeader } from "~/components/layout/app-header";
import { AppSider } from "~/components/layout/app-sider";

interface Props {
  children: React.ReactNode;
  userName: string;
  userImage: string | null | undefined;
}

export function AdminLayoutShell({ children, userName, userImage }: Props) {
  const { token } = theme.useToken();
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <AppSider role="admin" />
      <Layout style={{ flex: 1 }}>
        <AppHeader userName={userName} userImage={userImage} />
        <Layout.Content
          style={{
            padding: 24,
            background: token.colorBgLayout,
            minHeight: "calc(100vh - 56px)",
          }}
        >
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
