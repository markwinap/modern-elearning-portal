"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { MailOutlined } from "@ant-design/icons";

import { authClient } from "~/server/better-auth/client";

interface ForgotPasswordValues {
  email: string;
}

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<ForgotPasswordValues>();

  async function handleSubmit(values: ForgotPasswordValues) {
    setError(null);
    setLoading(true);
    try {
      const { error } = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message ?? "Failed to send reset email.");
        return;
      }

      setSubmitted(true);
      form.resetFields();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card style={{ width: 440, boxShadow: "0 2px 16px rgba(0,0,0,0.08)" }}>
        <Space orientation="vertical" size={24} style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Typography.Title level={3} style={{ marginBottom: 4 }}>
              Reset your password
            </Typography.Title>
            <Typography.Text type="secondary">
              Enter your email and we&apos;ll send you a reset link.
            </Typography.Text>
          </div>

          {submitted ? (
            <Alert
              type="success"
              showIcon
              message="Check your email"
              description="If an account exists with that address, you will receive a password reset link."
            />
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              requiredMark={false}
            >
              {error && <Alert type="error" showIcon message={error} />}

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="you@example.com"
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
                  Send reset link
                </Button>
              </Form.Item>
            </Form>
          )}

          <div style={{ textAlign: "center" }}>
            <Link href="/login">Back to sign in</Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}
