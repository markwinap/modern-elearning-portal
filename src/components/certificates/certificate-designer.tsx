"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Typography,
} from "antd";
import { useState } from "react";

import { renderCertificateSvg } from "~/lib/certificate-render";
import { useTRPC } from "~/trpc/react";

interface TemplateValues {
  name: string;
  title: string;
  issuer: string;
  signerName?: string;
  accentColor: string;
  autoIssue: boolean;
  validityDays?: number | null;
}

export function CertificateDesigner({ courseId }: { courseId: number }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<TemplateValues>();
  const [previewKey, setPreviewKey] = useState(0);

  const { data: template } = useQuery(
    trpc.certificate.getTemplate.queryOptions({ courseId }),
  );
  const save = useMutation(
    trpc.certificate.upsertTemplate.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.certificate.getTemplate.queryKey({ courseId }),
        });
        void message.success("Certificate template saved");
      },
      onError: (error) => void message.error(error.message),
    }),
  );

  const values = Form.useWatch([], form) ?? template;
  const previewSvg = renderCertificateSvg({
    title: values?.title ?? "Certificate of Completion",
    learnerName: "Jane Learner",
    courseTitle: "Sample Course",
    issuer: values?.issuer ?? "Modern E-Learning Portal",
    signerName: values?.signerName ?? null,
    accentColor: values?.accentColor ?? "#1677ff",
    serial: "CERT-PREVIEW",
    issuedAt: new Date(),
    expiresAt: null,
  });
  void previewKey;

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Card title="Template settings">
        <Form
          form={form}
          layout="vertical"
          initialValues={
            template ?? {
              name: "Default template",
              title: "Certificate of Completion",
              issuer: "Modern E-Learning Portal",
              accentColor: "#1677ff",
              autoIssue: true,
            }
          }
          onFinish={(v: TemplateValues) =>
            save.mutate({
              courseId,
              ...v,
              validityDays: v.validityDays ?? null,
            })
          }
          onValuesChange={() => setPreviewKey((k) => k + 1)}
        >
          <Form.Item
            name="name"
            label="Template name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="title"
            label="Certificate title"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="issuer" label="Issuer" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="signerName" label="Signer name (optional)">
            <Input />
          </Form.Item>
          <Form.Item name="accentColor" label="Accent color">
            <Input type="color" />
          </Form.Item>
          <Form.Item
            name="validityDays"
            label="Validity (days, blank = never expires)"
          >
            <InputNumber min={0} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item
            name="autoIssue"
            valuePropName="checked"
            label="Auto-issue on course completion"
          >
            <Switch />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={save.isPending}>
            Save template
          </Button>
        </Form>
      </Card>
      <Card title="Preview">
        <Typography.Text
          type="secondary"
          style={{ display: "block", marginBottom: 8 }}
        >
          Preview updates when the form changes.
        </Typography.Text>
        {}
        <div
          dangerouslySetInnerHTML={{ __html: previewSvg }}
          style={{ maxWidth: "100%" }}
        />
      </Card>
    </Space>
  );
}
