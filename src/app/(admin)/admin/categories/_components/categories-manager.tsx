"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { useEffect } from "react";
import { App, Button, Form, Input, Popconfirm, Space, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

import { EntityTable } from "~/components/ui/entity-table";
import { FormModal } from "~/components/ui/form-modal";
import { ToolbarRow } from "~/components/ui/toolbar-row";
import { toastMutationOptions } from "~/lib/mutation-utils";
import { useCrudModal } from "~/lib/use-crud-modal";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

interface Props {
  categories: Category[];
}

interface CategoryFormValues {
  name: string;
  description: string;
}

export function CategoriesManager({ categories: initialCategories }: Props) {
  const trpc = useTRPC();
  const { message: messageApi } = App.useApp();
  const modal = useCrudModal<Category>();
  const [form] = Form.useForm<CategoryFormValues>();
  const queryClient = useQueryClient();

  const { data: categories = initialCategories, isLoading } = useQuery(
    trpc.category.list.queryOptions(),
  );

  useEffect(() => {
    if (!modal.isOpen) return;
    if (modal.editing) {
      form.setFieldsValue({
        name: modal.editing.name,
        description: modal.editing.description ?? "",
      });
    } else {
      form.resetFields();
    }
  }, [modal.isOpen, modal.editing, form]);

  const createCategory = useMutation(
    trpc.category.create.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Category created!",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.category.list.queryKey(),
          }),
        onSuccess: () => {
          modal.close();
          form.resetFields();
        },
      }),
    }),
  );

  const updateCategory = useMutation(
    trpc.category.update.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Category updated!",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.category.list.queryKey(),
          }),
        onSuccess: () => modal.close(),
      }),
    }),
  );

  const deleteCategory = useMutation(
    trpc.category.delete.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Category deleted.",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.category.list.queryKey(),
          }),
      }),
    }),
  );

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
            onClick={() => modal.openEdit(cat)}
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
      <ToolbarRow
        right={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => modal.openCreate()}
          >
            New Category
          </Button>
        }
      />

      <EntityTable
        dataSource={categories}
        columns={columns}
        loading={isLoading}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: "No categories yet." }}
      />

      <FormModal
        form={form}
        title={modal.editing ? `Edit "${modal.editing.name}"` : "New Category"}
        open={modal.isOpen}
        onCancel={() => modal.close()}
        confirmLoading={
          modal.editing ? updateCategory.isPending : createCategory.isPending
        }
        onFinish={(v: CategoryFormValues) => {
          const values = {
            name: v.name,
            description: v.description || undefined,
          };
          if (modal.editing) {
            updateCategory.mutate({ id: modal.editing.id, ...values });
          } else {
            createCategory.mutate(values);
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
