"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
} from "antd";

import { useTRPC } from "~/trpc/react";

type RuleType =
  | "date"
  | "enrollment_offset"
  | "activity_completion"
  | "prerequisite_score"
  | "manual";
interface RuleForm {
  type: RuleType;
  releaseAt?: string;
  offsetDays?: number;
  prerequisiteActivityId?: number;
  minimumScore?: number;
  manuallyReleased?: boolean;
}
interface Props {
  target: "section" | "activity";
  targetId: number;
}

export function ReleaseRuleBuilder({ target, targetId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<{ rules: RuleForm[] }>();
  const sectionQuery = useQuery({
    ...trpc.section.getReleaseRules.queryOptions({ sectionId: targetId }),
    enabled: target === "section",
  });
  const activityQuery = useQuery({
    ...trpc.activity.getReleaseRules.queryOptions({ activityId: targetId }),
    enabled: target === "activity",
  });
  const rows = target === "section" ? sectionQuery.data : activityQuery.data;
  useEffect(() => {
    if (rows)
      form.setFieldsValue({
        rules: rows.map((row) => ({
          type: row.type,
          releaseAt: row.releaseAt?.toISOString(),
          offsetDays: row.offsetDays ?? undefined,
          prerequisiteActivityId: row.prerequisiteActivityId ?? undefined,
          minimumScore: row.minimumScore ?? undefined,
          manuallyReleased: row.manuallyReleased,
        })),
      });
  }, [form, rows]);
  const sectionMutation = useMutation(
    trpc.section.setReleaseRules.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.section.getReleaseRules.queryKey({
            sectionId: targetId,
          }),
        }),
    }),
  );
  const activityMutation = useMutation(
    trpc.activity.setReleaseRules.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.activity.getReleaseRules.queryKey({
            activityId: targetId,
          }),
        }),
    }),
  );
  function save({ rules = [] }: { rules: RuleForm[] }) {
    const normalized = rules.map((rule) => {
      if (rule.type === "date")
        return {
          type: "date" as const,
          releaseAt: new Date(rule.releaseAt ?? ""),
        };
      if (rule.type === "enrollment_offset")
        return {
          type: "enrollment_offset" as const,
          offsetDays: rule.offsetDays ?? 0,
        };
      if (rule.type === "activity_completion")
        return {
          type: "activity_completion" as const,
          prerequisiteActivityId: rule.prerequisiteActivityId ?? 0,
        };
      if (rule.type === "prerequisite_score")
        return {
          type: "prerequisite_score" as const,
          prerequisiteActivityId: rule.prerequisiteActivityId ?? 0,
          minimumScore: rule.minimumScore ?? 0,
        };
      return {
        type: "manual" as const,
        manuallyReleased: rule.manuallyReleased ?? false,
      };
    });
    const notifySuccess = () => {
      void message.success("Release rules saved");
    };
    if (target === "section")
      sectionMutation.mutate(
        { sectionId: targetId, rules: normalized },
        { onSuccess: notifySuccess },
      );
    else
      activityMutation.mutate(
        { activityId: targetId, rules: normalized },
        { onSuccess: notifySuccess },
      );
  }
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={save}
      initialValues={{ rules: [] }}
    >
      <Form.List name="rules">
        {(fields, { add, remove }) => (
          <Space orientation="vertical" style={{ width: "100%" }}>
            {fields.map(({ key, name }) => (
              <Space key={key} align="start" wrap>
                <Form.Item name={[name, "type"]} rules={[{ required: true }]}>
                  <Select
                    style={{ width: 190 }}
                    placeholder="Rule type"
                    options={[
                      { value: "date", label: "Specific date" },
                      {
                        value: "enrollment_offset",
                        label: "Days after enrollment",
                      },
                      {
                        value: "activity_completion",
                        label: "Activity completed",
                      },
                      {
                        value: "prerequisite_score",
                        label: "Prerequisite score",
                      },
                      { value: "manual", label: "Manual release" },
                    ]}
                  />
                </Form.Item>
                <Form.Item noStyle shouldUpdate>
                  {() => {
                    const type = form.getFieldValue(["rules", name, "type"]) as
                      | RuleType
                      | undefined;
                    if (type === "date")
                      return (
                        <Form.Item name={[name, "releaseAt"]}>
                          <Input type="datetime-local" />
                        </Form.Item>
                      );
                    if (type === "enrollment_offset")
                      return (
                        <Form.Item name={[name, "offsetDays"]}>
                          <InputNumber min={0} placeholder="Days" />
                        </Form.Item>
                      );
                    if (type === "activity_completion")
                      return (
                        <Form.Item name={[name, "prerequisiteActivityId"]}>
                          <InputNumber min={1} placeholder="Activity ID" />
                        </Form.Item>
                      );
                    if (type === "prerequisite_score")
                      return (
                        <>
                          <Form.Item name={[name, "prerequisiteActivityId"]}>
                            <InputNumber min={1} placeholder="Activity ID" />
                          </Form.Item>
                          <Form.Item name={[name, "minimumScore"]}>
                            <InputNumber
                              min={0}
                              max={100}
                              placeholder="Score %"
                            />
                          </Form.Item>
                        </>
                      );
                    if (type === "manual")
                      return (
                        <Form.Item
                          name={[name, "manuallyReleased"]}
                          valuePropName="checked"
                        >
                          <Switch
                            checkedChildren="Released"
                            unCheckedChildren="Locked"
                          />
                        </Form.Item>
                      );
                    return null;
                  }}
                </Form.Item>
                <Button danger onClick={() => remove(name)}>
                  Remove
                </Button>
              </Space>
            ))}
            <Button onClick={() => add({ type: "date" })}>
              Add release rule
            </Button>
          </Space>
        )}
      </Form.List>
      <Button
        type="primary"
        htmlType="submit"
        loading={sectionMutation.isPending || activityMutation.isPending}
        style={{ marginTop: 16 }}
      >
        Save release rules
      </Button>
    </Form>
  );
}
