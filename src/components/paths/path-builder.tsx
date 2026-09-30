"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Form,
  Input,
  Popconfirm,
  Select,
  Slider,
  Space,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";

import { EntityTable } from "~/components/ui/entity-table";
import { FormModal } from "~/components/ui/form-modal";
import { ToolbarRow } from "~/components/ui/toolbar-row";
import { toastMutationOptions } from "~/lib/mutation-utils";
import { useCrudModal } from "~/lib/use-crud-modal";
import { useTRPC } from "~/trpc/react";

interface CourseOption {
  id: number;
  title: string;
}

interface SkillOption {
  id: number;
  name: string;
}

interface PathListItem {
  id: number;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  targetRole: string | null;
  createdAt: Date;
}

interface Props {
  courses: CourseOption[];
  skills: SkillOption[];
}

interface FormValues {
  title: string;
  description?: string;
  targetRole?: string;
  status: "draft" | "published" | "archived";
  courseIds: number[];
  skillTargets: Record<string, number>;
}

export function PathBuilder({ courses, skills }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { message: messageApi } = App.useApp();
  const modal = useCrudModal<PathListItem>();
  const [form] = Form.useForm<FormValues>();

  const { data: paths = [], isLoading } = useQuery(
    trpc.learningPath.listAll.queryOptions(),
  );

  const pathDetails = useQuery(
    trpc.learningPath.getById.queryOptions(
      { id: modal.editing?.id ?? 0 },
      { enabled: !!modal.editing },
    ),
  );

  useEffect(() => {
    if (!modal.isOpen) return;
    if (modal.editing && pathDetails.data) {
      const { path, courses: pathCourses, skillTargets } = pathDetails.data;
      const sortedCourseIds = [...pathCourses]
        .sort((a, b) => a.order - b.order)
        .map((c) => c.courseId);
      const skillTargetMap = Object.fromEntries(
        skillTargets.map((s) => [String(s.skillId), s.targetLevel]),
      );
      form.setFieldsValue({
        title: path.title,
        description: path.description ?? undefined,
        targetRole: path.targetRole ?? undefined,
        status: path.status,
        courseIds: sortedCourseIds,
        skillTargets: skillTargetMap,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({
        status: "draft",
        courseIds: [],
        skillTargets: {},
      });
    }
  }, [modal.isOpen, modal.editing, pathDetails.data, form]);

  const invalidatePaths = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.learningPath.listAll.queryKey(),
    });

  const create = useMutation(
    trpc.learningPath.create.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Learning path created",
        invalidate: invalidatePaths,
        onSuccess: () => {
          modal.close();
          form.resetFields();
        },
      }),
    }),
  );

  const update = useMutation(
    trpc.learningPath.update.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Learning path updated",
        invalidate: invalidatePaths,
        onSuccess: () => modal.close(),
      }),
    }),
  );

  const remove = useMutation(
    trpc.learningPath.delete.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Learning path deleted",
        invalidate: invalidatePaths,
      }),
    }),
  );

  const columns: ColumnsType<PathListItem> = [
    {
      title: "Title",
      key: "title",
      render: (_: unknown, path: PathListItem) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{path.title}</Typography.Text>
          {path.description && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {path.description}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag
          color={
            status === "published"
              ? "green"
              : status === "archived"
                ? "red"
                : "default"
          }
        >
          {status}
        </Tag>
      ),
    },
    {
      title: "Target role",
      dataIndex: "targetRole",
      key: "targetRole",
      render: (role: string | null) => role ?? "—",
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, path: PathListItem) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => modal.openEdit(path)}
          />
          <Popconfirm
            title="Delete this learning path?"
            onConfirm={() => remove.mutate({ id: path.id })}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={remove.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <ToolbarRow
        right={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => modal.openCreate()}
          >
            New learning path
          </Button>
        }
      />

      <EntityTable
        dataSource={paths}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No learning paths yet." }}
      />

      <FormModal
        form={form}
        title={
          modal.editing ? `Edit "${modal.editing.title}"` : "New learning path"
        }
        open={modal.isOpen}
        onCancel={() => modal.close()}
        confirmLoading={
          modal.editing
            ? update.isPending || pathDetails.isLoading
            : create.isPending
        }
        onFinish={(v: FormValues) => {
          const values = {
            title: v.title,
            description: v.description,
            targetRole: v.targetRole,
            status: v.status,
            courseIds: v.courseIds,
            skillTargets: v.skillTargets,
          };
          if (modal.editing) {
            update.mutate({ id: modal.editing.id, ...values });
          } else {
            create.mutate(values);
          }
        }}
      >
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="targetRole" label="Target role">
          <Input placeholder="e.g. Senior Engineer" />
        </Form.Item>
        <Form.Item name="status" label="Status">
          <Select
            options={[
              { label: "Draft", value: "draft" },
              { label: "Published", value: "published" },
              { label: "Archived", value: "archived" },
            ]}
          />
        </Form.Item>
        <Form.Item name="courseIds" label="Courses (in order)">
          <Select
            mode="multiple"
            options={courses.map((c) => ({ label: c.title, value: c.id }))}
          />
        </Form.Item>
        <Typography.Text>Skill targets</Typography.Text>
        {skills.map((skill) => (
          <Form.Item
            key={skill.id}
            name={["skillTargets", String(skill.id)]}
            label={skill.name}
            initialValue={0}
          >
            <Slider marks={{ 0: "0", 50: "50", 100: "100" }} max={100} />
          </Form.Item>
        ))}
      </FormModal>
    </>
  );
}
