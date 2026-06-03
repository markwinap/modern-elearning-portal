"use client";

import { Button, Space, Typography, theme } from "antd";
import Link from "next/link";

const { Title, Paragraph } = Typography;

export function HomeHero() {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: token.colorBgLayout,
        padding: 24,
        textAlign: "center",
      }}
    >
      <Title style={{ color: token.colorPrimary, marginBottom: 8, fontSize: 48 }}>
        EduCore
      </Title>
      <Paragraph
        style={{ fontSize: 18, color: token.colorTextSecondary, maxWidth: 520, marginBottom: 40 }}
      >
        A modern learning management system for students, teachers, and
        administrators.
      </Paragraph>

      <Space size={16}>
        <Link href="/login">
          <Button type="primary" size="large" style={{ minWidth: 120 }}>
            Sign In
          </Button>
        </Link>
        <Link href="/register">
          <Button size="large" style={{ minWidth: 120 }}>
            Get Started
          </Button>
        </Link>
      </Space>
    </div>
  );
}
