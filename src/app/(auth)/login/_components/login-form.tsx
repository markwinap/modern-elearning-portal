"use client";

import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "~/server/better-auth/client";

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();

  async function handleSubmit(values: LoginFormValues) {
    setError(null);
    setLoading(true);
    try {
      await authClient.signIn.email(
        { email: values.email, password: values.password },
        {
          onSuccess: () => {
            router.push("/dashboard");
            router.refresh();
          },
          onError: (ctx) => {
            setError(ctx.error.message ?? "Invalid email or password.");
          },
        },
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={{ width: 400, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
      <Space orientation="vertical" size={24} style={{ width: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            Sign in to EduCore
          </Typography.Title>
          <Typography.Text type="secondary">
            Don&apos;t have an account?{" "}
            <Link href="/register">Register</Link>
          </Typography.Text>
        </div>

        {error && <Alert title={error} type="error" showIcon />}

        <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Password is required" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="••••••••"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center" }}>
          <Button
            icon={<span style={{ marginRight: 8 }}>⚡</span>}
            size="large"
            block
            onClick={() => authClient.signIn.social({ provider: "github" })}
            style={{ border: "1px solid #d9d9d9" }}
          >
            Continue with GitHub
          </Button>
        </div>
      </Space>
    </Card>
  );
}
