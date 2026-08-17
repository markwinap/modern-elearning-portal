"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
} from "antd";
import { LockOutlined } from "@ant-design/icons";

import { authClient } from "~/server/better-auth/client";

interface ResetPasswordValues {
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<ResetPasswordValues>();

  async function handleSubmit(values: ResetPasswordValues) {
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: values.newPassword,
        token,
      });

      if (resetError) {
        setError(resetError.message ?? "Failed to reset password.");
        return;
      }

      setSuccess(true);
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
              Set new password
            </Typography.Title>
            <Typography.Text type="secondary">
              Choose a strong new password for your account.
            </Typography.Text>
          </div>

          {!token ? (
            <Alert
              type="error"
              showIcon
              message="Invalid reset link"
              description="The password reset link is missing or expired. Please request a new one."
            />
          ) : success ? (
            <Alert
              type="success"
              showIcon
              message="Password updated"
              description={
                <>
                  Your password has been reset. You can now{" "}
                  <Link href="/login">sign in</Link> with your new password.
                </>
              }
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
                name="newPassword"
                label="New Password"
                rules={[
                  { required: true, message: "Password is required" },
                  {
                    min: 8,
                    message: "Password must be at least 8 characters",
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Min 8 characters"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "Please confirm your password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Passwords do not match"),
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Re-enter password"
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
                  Reset password
                </Button>
              </Form.Item>
            </Form>
          )}
        </Space>
      </Card>
    </div>
  );
}
