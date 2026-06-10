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
  Tag,
  Typography,
  message,
  theme,
  App,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileOutlined,
} from "@ant-design/icons";

import Link from "next/link";

import { api } from "~/trpc/react";

interface Props {
  courseId: number;
}

const ACTIVITY_TYPES = [
  { value: "lesson", label: "Lesson" },
  { value: "quiz", label: "Quiz" },
  { value: "page", label: "Page" },
  { value: "file", label: "File" },
  { value: "url", label: "URL" },
  { value: "text_media", label: "Text/Media" },
  { value: "wiki", label: "Wiki" },
  { value: "workshop", label: "Workshop" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  lesson: "blue",
  quiz: "red",
  page: "green",
  file: "orange",
  url: "cyan",
  text_media: "purple",
  wiki: "geekblue",
  workshop: "magenta",
};

function ActivityList({
  sectionId,
  courseId,
}: {
  sectionId: number;
  courseId: number;
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const { modal } = App.useApp();
  const [addModal, setAddModal] = useState(false);
  const [form] = Form.useForm<{ title: string; type: string }>();
  const utils = api.useUtils();
  const { token } = theme.useToken();

  const { data: activities = [], isLoading } =
    api.activity.listBySection.useQuery({ sectionId });

  const createActivity = api.activity.create.useMutation({
    onSuccess: () => {
      void utils.activity.listBySection.invalidate({ sectionId });
      setAddModal(false);
      form.resetFields();
      messageApi.success("Activity added!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const deleteActivity = api.activity.delete.useMutation({
    onSuccess: () =>
      void utils.activity.listBySection.invalidate({ sectionId }),
    onError: (err) => messageApi.error(err.message),
  });

  return (
    <>
      {contextHolder}
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
                <FileOutlined />
                <Typography.Text style={{ flex: 1 }}>
                  {act.title}
                </Typography.Text>
                <Tag color={TYPE_COLORS[act.type] ?? "default"}>{act.type}</Tag>
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

      <Modal
        title="Add Activity"
        open={addModal}
        onCancel={() => {
          setAddModal(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createActivity.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) =>
            createActivity.mutate({
              sectionId,
              title: v.title,
              type: v.type as
                | "lesson"
                | "quiz"
                | "page"
                | "file"
                | "url"
                | "text_media"
                | "wiki"
                | "workshop",
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
        </Form>
      </Modal>
    </>
  );
}

export function SectionBuilder({ courseId }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const { modal } = App.useApp();
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [editSection, setEditSection] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [form] = Form.useForm<{ title: string }>();
  const utils = api.useUtils();
  const { token } = theme.useToken();

  const { data: sections = [], isLoading } = api.section.listByCourse.useQuery({
    courseId,
  });

  const createSection = api.section.create.useMutation({
    onSuccess: () => {
      void utils.section.listByCourse.invalidate({ courseId });
      setAddSectionOpen(false);
      form.resetFields();
      messageApi.success("Section added!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const updateSection = api.section.update.useMutation({
    onSuccess: () => {
      void utils.section.listByCourse.invalidate({ courseId });
      setEditSection(null);
      messageApi.success("Section updated!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const deleteSection = api.section.delete.useMutation({
    onSuccess: () => {
      void utils.section.listByCourse.invalidate({ courseId });
      messageApi.success("Section deleted.");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const collapseItems = sections.map((sec) => ({
    key: String(sec.id),
    label: (
      <Space>
        <Typography.Text strong>{sec.title}</Typography.Text>
        {!sec.visible && <Tag>Hidden</Tag>}
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            setEditSection({ id: sec.id, title: sec.title });
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
      {contextHolder}

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

      {/* Add section modal */}
      <Modal
        title="Add Section"
        open={addSectionOpen}
        onCancel={() => {
          setAddSectionOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={createSection.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) =>
            createSection.mutate({
              courseId,
              title: v.title,
              order: sections.length,
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
        </Form>
      </Modal>

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
            });
        }}
        confirmLoading={updateSection.isPending}
      >
        <Input
          value={editSection?.title ?? ""}
          onChange={(e) =>
            setEditSection((s) => (s ? { ...s, title: e.target.value } : null))
          }
        />
      </Modal>
    </>
  );
}
