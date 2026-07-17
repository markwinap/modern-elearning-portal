"use client";

import { useState } from "react";
import {
  App,
  Button,
  Form,
  Input,
  Popconfirm,
  Space,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";
import { FormModal } from "~/components/ui/form-modal";
import { toastMutationOptions } from "~/lib/mutation-utils";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

interface Props {
  categories: Category[];
}

interface CreateFormValues {
  name: string;
  description: string;
}

interface EditFormValues {
  name: string;
  description: string;
}

export function CategoriesManager({ categories: initialCategories }: Props) {
  const { message: messageApi } = App.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [createForm] = Form.useForm<CreateFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();
  const utils = api.useUtils();

  const { data: categories = initialCategories, isLoading } =
    api.category.list.useQuery();

  const createCategory = api.category.create.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Category created!",
      invalidate: () => utils.category.list.invalidate(),
      onSuccess: () => {
        setCreateOpen(false);
        createForm.resetFields();
      },
    }),
  });

  const updateCategory = api.category.update.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Category updated!",
      invalidate: () => utils.category.list.invalidate(),
      onSuccess: () => setEditTarget(null),
    }),
  });

  const deleteCategory = api.category.delete.useMutation({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Category deleted.",
      invalidate: () => utils.category.list.invalidate(),
    }),
  });

  function openEdit(cat: Category) {
    setEditTarget(cat);
    editForm.setFieldsValue({
      name: cat.name,
      description: cat.description ?? "",
    });
  }

  const columns: ColumnsType<Category> = [
    {
      title: "Name",
      key: "name",
      render: (_: unknown, cat: Category) => (
        <div>
          <Typography.Text strong>{cat.name}</Typography.Text>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            /{cat.slug}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (d: string | null) =>
        d ?? <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_: unknown, cat: Category) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEdit(cat)}
          />
          <Popconfirm
            title="Delete this category? This may affect courses."
            onConfirm={() => deleteCategory.mutate({ id: cat.id })}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deleteCategory.isPending}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          New Category
        </Button>
      </div>

      <Table
        dataSource={categories}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No categories yet." }}
      />

      <FormModal
        form={createForm}
        title="New Category"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        confirmLoading={createCategory.isPending}
        onFinish={(v: CreateFormValues) =>
          createCategory.mutate({
            name: v.name,
            description: v.description || undefined,
          })
        }
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, min: 1 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} />
        </Form.Item>
      </FormModal>

      <FormModal
        form={editForm}
        title={`Edit "${editTarget?.name ?? ""}"`}
        open={!!editTarget}
        onCancel={() => setEditTarget(null)}
        confirmLoading={updateCategory.isPending}
        onFinish={(v: EditFormValues) => {
          if (editTarget) {
            updateCategory.mutate({
              id: editTarget.id,
              name: v.name,
              description: v.description || undefined,
            });
          }
        }}
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, min: 1 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} />
        </Form.Item>
      </FormModal>
    </>
  );
}
