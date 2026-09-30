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

interface Skill {
  id: number;
  name: string;
  description: string | null;
  categoryId: number | null;
}

interface FormValues {
  name: string;
  description?: string;
  categoryId?: number | null;
}

export default function SkillsAdminPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { message: messageApi } = App.useApp();
  const modal = useCrudModal<Skill>();
  const [form] = Form.useForm<FormValues>();

  const { data: { skills = [], categories = [] } = {}, isLoading } = useQuery(
    trpc.skill.listWithCategories.queryOptions(),
  );

  useEffect(() => {
    if (!modal.isOpen) return;
    if (modal.editing) {
      form.setFieldsValue({
        name: modal.editing.name,
        description: modal.editing.description ?? undefined,
        categoryId: modal.editing.categoryId ?? null,
      });
    } else {
      form.resetFields();
    }
  }, [modal.isOpen, modal.editing, form]);

  const invalidateSkills = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.skill.listWithCategories.queryKey(),
    });

  const createSkill = useMutation(
    trpc.skill.create.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Skill created",
        invalidate: invalidateSkills,
        onSuccess: () => {
          modal.close();
          form.resetFields();
        },
      }),
    }),
  );

  const updateSkill = useMutation(
    trpc.skill.update.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Skill updated",
        invalidate: invalidateSkills,
        onSuccess: () => modal.close(),
      }),
    }),
  );

  const deleteSkill = useMutation(
    trpc.skill.delete.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Skill deleted",
        invalidate: invalidateSkills,
      }),
    }),
  );

  const columns: ColumnsType<Skill> = [
    {
      title: "Name",
      key: "name",
      render: (_: unknown, skill: Skill) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text strong>{skill.name}</Typography.Text>
          {skill.description && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {skill.description}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Category",
      key: "category",
      render: (_: unknown, skill: Skill) => {
        const category = categories.find((c) => c.id === skill.categoryId);
        return category ? (
          <Tag>{category.name}</Tag>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, skill: Skill) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => modal.openEdit(skill)}
          />
          <Popconfirm
            title="Delete this skill?"
            onConfirm={() => deleteSkill.mutate({ id: skill.id })}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteSkill.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <main style={{ padding: 24 }}>
      <h1>Skills taxonomy</h1>
      <ToolbarRow
        right={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => modal.openCreate()}
          >
            Add skill
          </Button>
        }
      />

      <EntityTable
        dataSource={skills}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No skills yet." }}
      />

      <FormModal
        form={form}
        title={modal.editing ? `Edit "${modal.editing.name}"` : "Add skill"}
        open={modal.isOpen}
        onCancel={() => modal.close()}
        confirmLoading={
          modal.editing ? updateSkill.isPending : createSkill.isPending
        }
        onFinish={(v: FormValues) => {
          const values = {
            name: v.name,
            description: v.description,
            categoryId: v.categoryId ?? null,
          };
          if (modal.editing) {
            updateSkill.mutate({ id: modal.editing.id, ...values });
          } else {
            createSkill.mutate(values);
          }
        }}
      >
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea />
        </Form.Item>
        <Form.Item name="categoryId" label="Category">
          <Select
            allowClear
            options={categories.map((c) => ({ label: c.name, value: c.id }))}
          />
        </Form.Item>
      </FormModal>
    </main>
  );
}
