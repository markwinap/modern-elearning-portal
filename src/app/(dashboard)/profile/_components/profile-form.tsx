"use client";

import { Avatar, Button, Card, Col, Divider, Form, Input, Row, Space, Tag, Typography, message, theme } from "antd";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";

import { authClient } from "~/server/better-auth/client";

interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
}

interface Props {
  user: User;
}

interface ProfileFormValues {
  name: string;
}

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "red",
  teacher: "blue",
  student: "green",
};

export function ProfileForm({ user }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [profileForm] = Form.useForm<ProfileFormValues>();
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const { token } = theme.useToken();

  async function handleProfileSave(values: ProfileFormValues) {
    try {
      await authClient.updateUser({ name: values.name });
      messageApi.success("Profile updated!");
    } catch {
      messageApi.error("Failed to update profile.");
    }
  }

  async function handlePasswordChange(values: PasswordFormValues) {
    try {
      await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: false,
      });
      messageApi.success("Password changed!");
      passwordForm.resetFields();
    } catch {
      messageApi.error("Failed to change password. Check your current password.");
    }
  }

  return (
    <>
      {contextHolder}
      <Typography.Title level={2} style={{ marginBottom: 24 }}>
        My Profile
      </Typography.Title>

      <Row gutter={[24, 24]}>
        {/* Avatar card */}
        <Col xs={24} md={8}>
          <Card>
            <Space orientation="vertical" align="center" style={{ width: "100%" }}>
              <Avatar
                size={96}
                src={user.image}
                icon={<UserOutlined />}
                style={{ background: token.colorPrimary }}
              />
              <Typography.Title level={4} style={{ margin: 0 }}>
                {user.name}
              </Typography.Title>
              <Typography.Text type="secondary">{user.email}</Typography.Text>
              <Tag color={ROLE_COLORS[user.role ?? "student"] ?? "default"}>
                {user.role ?? "student"}
              </Tag>
            </Space>
          </Card>
        </Col>

        {/* Edit forms */}
        <Col xs={24} md={16}>
          <Card title="Account Details">
            <Form
              form={profileForm}
              layout="vertical"
              initialValues={{ name: user.name }}
              onFinish={handleProfileSave}
            >
              <Form.Item
                name="name"
                label="Display Name"
                rules={[{ required: true, min: 1, message: "Name is required" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Your name" />
              </Form.Item>

              <Form.Item label="Email">
                <Input
                  prefix={<MailOutlined />}
                  value={user.email}
                  disabled
                  style={{ color: token.colorTextSecondary }}
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit">
                  Save Changes
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            <Typography.Title level={5}>Change Password</Typography.Title>
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handlePasswordChange}
            >
              <Form.Item
                name="currentPassword"
                label="Current Password"
                rules={[{ required: true, message: "Enter your current password" }]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="New Password"
                rules={[
                  { required: true, message: "Enter a new password" },
                  { min: 8, message: "Password must be at least 8 characters" },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                dependencies={["newPassword"]}
                rules={[
                  { required: true, message: "Confirm your new password" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Passwords do not match"));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button htmlType="submit">Change Password</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </>
  );
}
