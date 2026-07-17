"use client";

import { useState } from "react";
import {
  Button,
  Collapse,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
  App,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

import Link from "next/link";

import { api } from "~/trpc/react";
import { ActivityBadge } from "~/components/ui/activity-badge";
import { ActivityIcon } from "~/components/ui/activity-icon";
import { FormModal } from "~/components/ui/form-modal";
import { toastMutationOptions } from "~/lib/mutation-utils";
import { ACTIVITY_TYPES, type ActivityType } from "~/lib/activity-types";

interface Props {
  courseId: number;
}

function ActivityList({
  sectionId,
  courseId,
}: {
  sectionId: number;
  courseId: number;
}) {
  const { message: messageApi, modal } = App.useApp();
  const [addModal, setAddModal] = useState(false);
  const [form] = Form.useForm<{ title: string; type: string }>();
  const utils = api.useUtils();
  const { token } = theme.useToken();

  const { data: activities = [], isLoading } =
    api.activity.listBySection.useQuery({ sectionId });

  const createActivity = api.activity.create.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Activity added!",
      invalidate: () => utils.activity.listBySection.invalidate({ sectionId }),
      onSuccess: () => {
        setAddModal(false);
        form.resetFields();
      },
    }),
  });

  const deleteActivity = api.activity.delete.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Activity deleted.",
      invalidate: () => utils.activity.listBySection.invalidate({ sectionId }),
    }),
  });

  return (
    <>
      <div style={{ padding: "0 0 8px" }}>
        {isLoading ? (
          <Space orientation="vertical" style={{ width: "100%" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: token.colorFillAlter,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Skeleton.Avatar active size="small" shape="square" />
                <Skeleton.Input active size="small" style={{ flex: 1 }} />
              </div>
            ))}
          </Space>
        ) : activities.length === 0 ? (
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginBottom: 8 }}
          >
            No activities yet.
          </Typography.Text>
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }}>
            {activities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: token.colorFillAlter,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <ActivityIcon type={act.type} />
                <Typography.Text style={{ flex: 1 }}>
                  {act.title}
                </Typography.Text>
                <ActivityBadge type={act.type} />
                <Link href={`/teach/courses/${courseId}/activities/${act.id}`}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    title="Edit content"
                  />
                </Link>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={deleteActivity.isPending}
                  onClick={() =>
                    modal.confirm({
                      title: "Delete activity?",
                      content: `"${act.title}" will be permanently removed.`,
                      okText: "Delete",
                      okButtonProps: { danger: true },
                      onOk: () => deleteActivity.mutate({ id: act.id }),
                    })
                  }
                />
              </div>
            ))}
          </Space>
        )}

        <Button
          size="small"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={() => setAddModal(true)}
        >
          Add Activity
        </Button>
      </div>

      <FormModal
        form={form}
        title="Add Activity"
        open={addModal}
        onCancel={() => {
          setAddModal(false);
          form.resetFields();
        }}
        confirmLoading={createActivity.isPending}
        onFinish={(v) =>
          createActivity.mutate({
            sectionId,
            title: v.title,
            type: v.type as ActivityType,
            order: 0,
          })
        }
      >
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select options={[...ACTIVITY_TYPES]} />
        </Form.Item>
      </FormModal>
    </>
  );
}

export function SectionBuilder({ courseId }: Props) {
  const { message: messageApi, modal } = App.useApp();
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [editSection, setEditSection] = useState<{
    id: number;
    title: string;
    gradable: boolean;
  } | null>(null);
  const [form] = Form.useForm<{ title: string; gradable?: boolean }>();
  const utils = api.useUtils();
  const { token } = theme.useToken();

  const { data: sections = [], isLoading } = api.section.listByCourse.useQuery({
    courseId,
  });

  const createSection = api.section.create.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Section added!",
      invalidate: () => utils.section.listByCourse.invalidate({ courseId }),
      onSuccess: () => {
        setAddSectionOpen(false);
        form.resetFields();
      },
    }),
  });

  const updateSection = api.section.update.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Section updated!",
      invalidate: () => utils.section.listByCourse.invalidate({ courseId }),
      onSuccess: () => setEditSection(null),
    }),
  });

  const deleteSection = api.section.delete.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Section deleted.",
      invalidate: () => utils.section.listByCourse.invalidate({ courseId }),
    }),
  });

  const collapseItems = sections.map((sec) => ({
    key: String(sec.id),
    label: (
      <Space>
        <Typography.Text strong>{sec.title}</Typography.Text>
        {!sec.visible && <Tag>Hidden</Tag>}
        {!sec.gradable && <Tag color="orange">Not gradable</Tag>}
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            setEditSection({
              id: sec.id,
              title: sec.title,
              gradable: sec.gradable,
            });
          }}
        />
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          loading={deleteSection.isPending}
          onClick={(e) => {
            e.stopPropagation();
            modal.confirm({
              title: "Delete section?",
              content: `"${sec.title}" and all its activities will be permanently removed.`,
              okText: "Delete",
              okButtonProps: { danger: true },
              onOk: () => deleteSection.mutate({ id: sec.id }),
            });
          }}
        />
      </Space>
    ),
    children: <ActivityList sectionId={sec.id} courseId={courseId} />,
  }));

  return (
    <>
      {isLoading ? (
        <Space orientation="vertical" style={{ width: "100%" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 6,
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Skeleton.Input active size="small" style={{ flex: 1 }} />
              <Skeleton.Button active size="small" />
              <Skeleton.Button active size="small" />
            </div>
          ))}
        </Space>
      ) : sections.length === 0 ? (
        <Empty description="No sections yet" style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddSectionOpen(true)}
          >
            Add First Section
          </Button>
        </Empty>
      ) : (
        <>
          <Collapse
            items={collapseItems}
            defaultActiveKey={sections[0] ? [String(sections[0].id)] : []}
          />
          <Button
            type="dashed"
            block
            icon={<PlusOutlined />}
            style={{ marginTop: 16 }}
            onClick={() => setAddSectionOpen(true)}
          >
            Add Section
          </Button>
        </>
      )}

      <FormModal
        form={form}
        title="Add Section"
        open={addSectionOpen}
        onCancel={() => {
          setAddSectionOpen(false);
          form.resetFields();
        }}
        confirmLoading={createSection.isPending}
        onFinish={(v) =>
          createSection.mutate({
            courseId,
            title: v.title,
            order: sections.length,
            gradable: v.gradable ?? true,
          })
        }
      >
        <Form.Item
          name="title"
          label="Section Title"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="gradable"
          label="Gradable"
          valuePropName="checked"
          initialValue
        >
          <Switch checkedChildren="Gradable" unCheckedChildren="Not gradable" />
        </Form.Item>
      </FormModal>

      {/* Edit section modal */}
      <Modal
        title="Edit Section"
        open={!!editSection}
        onCancel={() => setEditSection(null)}
        onOk={() => {
          if (editSection)
            updateSection.mutate({
              id: editSection.id,
              title: editSection.title,
              gradable: editSection.gradable,
            });
        }}
        confirmLoading={updateSection.isPending}
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Input
            value={editSection?.title ?? ""}
            onChange={(e) =>
              setEditSection((s) =>
                s ? { ...s, title: e.target.value } : null,
              )
            }
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Switch
              checked={editSection?.gradable ?? true}
              checkedChildren="Gradable"
              unCheckedChildren="Not gradable"
              onChange={(checked) =>
                setEditSection((s) => (s ? { ...s, gradable: checked } : null))
              }
            />
            <Typography.Text>Gradable</Typography.Text>
          </div>
        </Space>
      </Modal>
    </>
  );
}
