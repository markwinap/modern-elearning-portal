"use client";

import { useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  theme,
} from "antd";

import { api } from "~/trpc/react";

interface AdminSettingsValues {
  platformName: string;
  supportEmail: string;
  defaultCourseCapacity: number;
  defaultEnrollmentMode: "open" | "approval";
  digestFrequency: "off" | "daily" | "weekly";
  sendSystemAnnouncements: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const ENROLLMENT_MODE_OPTIONS = [
  { label: "Open enrollment", value: "open" },
  { label: "Approval required", value: "approval" },
] as const;

const DIGEST_FREQUENCY_OPTIONS = [
  { label: "Off", value: "off" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
] as const;

interface Props {
  settings: AdminSettingsValues;
}

export function AdminSettingsPanel({ settings }: Props) {
  const [form] = Form.useForm<AdminSettingsValues>();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const utils = api.useUtils();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const updateSettings = api.settings.update.useMutation({
    onSuccess: async () => {
      setSavedAt(new Date().toLocaleString());
      message.success("Settings saved.");
      await utils.settings.get.invalidate();
    },
    onError: (error) => {
      message.error(error.message);
    },
  });

  function handleSave(values: AdminSettingsValues) {
    updateSettings.mutate(values);
  }

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <h2
          style={{
            marginBottom: 8,
            fontSize: 24,
            fontWeight: 700,
            color: token.colorText,
          }}
        >
          Admin Settings
        </h2>
        <p style={{ margin: 0, color: token.colorTextSecondary }}>
          Configure platform defaults for your organization.
        </p>
      </div>

      {savedAt ? (
        <Alert
          showIcon
          type="success"
          title={`Settings saved at ${savedAt}.`}
        />
      ) : null}

      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onFinish={handleSave}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="Branding & Contact" variant="outlined">
              <Form.Item
                label={
                  <span style={{ color: token.colorText }}>Platform Name</span>
                }
                name="platformName"
                rules={[
                  { required: true, message: "Platform name is required" },
                ]}
              >
                <Input placeholder="Modern E-Learning Portal" />
              </Form.Item>

              <Form.Item
                label={
                  <span style={{ color: token.colorText }}>Support Email</span>
                }
                name="supportEmail"
                rules={[
                  { required: true, message: "Support email is required" },
                  { type: "email", message: "Enter a valid email address" },
                ]}
              >
                <Input placeholder="support@example.com" />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Enrollment Defaults" variant="outlined">
              <Form.Item
                label={
                  <span style={{ color: token.colorText }}>
                    Default Course Capacity
                  </span>
                }
                name="defaultCourseCapacity"
                rules={[
                  { required: true, message: "Provide a default capacity" },
                ]}
              >
                <InputNumber min={1} max={100_000} style={{ width: "100%" }} />
              </Form.Item>

              <Form.Item
                label={
                  <span style={{ color: token.colorText }}>
                    Default Enrollment Mode
                  </span>
                }
                name="defaultEnrollmentMode"
              >
                <Select
                  options={ENROLLMENT_MODE_OPTIONS.slice()}
                  style={{
                    backgroundColor: token.colorBgContainer,
                    color: token.colorText,
                  }}
                />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Notification Defaults" variant="outlined">
              <Form.Item
                label={
                  <span style={{ color: token.colorText }}>
                    Digest Frequency
                  </span>
                }
                name="digestFrequency"
              >
                <Select
                  options={DIGEST_FREQUENCY_OPTIONS.slice()}
                  style={{
                    backgroundColor: token.colorBgContainer,
                    color: token.colorText,
                  }}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span style={{ color: token.colorText }}>
                    System Announcements
                  </span>
                }
                name="sendSystemAnnouncements"
                valuePropName="checked"
              >
                <Switch checkedChildren="On" unCheckedChildren="Off" />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Maintenance" variant="outlined">
              <Form.Item
                label={
                  <span style={{ color: token.colorText }}>
                    Maintenance Mode
                  </span>
                }
                name="maintenanceMode"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Enabled"
                  unCheckedChildren="Disabled"
                />
              </Form.Item>

              <Form.Item
                label={
                  <span style={{ color: token.colorText }}>
                    Maintenance Message
                  </span>
                }
                name="maintenanceMessage"
                rules={[
                  { required: true, message: "Add a maintenance message" },
                ]}
              >
                <Input.TextArea rows={4} />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Divider style={{ marginTop: 8, marginBottom: 16 }} />

        <Space size={12}>
          <Button
            type="primary"
            htmlType="submit"
            loading={updateSettings.isPending}
          >
            Save Settings
          </Button>
          <Button
            htmlType="button"
            onClick={() => form.resetFields()}
            disabled={updateSettings.isPending}
          >
            Reset
          </Button>
        </Space>
      </Form>
    </Space>
  );
}
