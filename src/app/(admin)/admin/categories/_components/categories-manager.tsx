"use client";

import { useState } from "react";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

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
  const [messageApi, contextHolder] = message.useMessage();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [createForm] = Form.useForm<CreateFormValues>();
  const [editForm] = Form.useForm<EditFormValues>();
  const utils = api.useUtils();

  const { data: categories = initialCategories, isLoading } =
    api.category.list.useQuery();

  const createCategory = api.category.create.useMutation({
    onSuccess: () => {
      void utils.category.list.invalidate();
      setCreateOpen(false);
      createForm.resetFields();
      messageApi.success("Category created!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const updateCategory = api.category.update.useMutation({
    onSuccess: () => {
      void utils.category.list.invalidate();
      setEditTarget(null);
      messageApi.success("Category updated!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const deleteCategory = api.category.delete.useMutation({
    onSuccess: () => {
      void utils.category.list.invalidate();
      messageApi.success("Category deleted.");
    },
    onError: (err) => messageApi.error(err.message),
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
      {contextHolder}
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

      {/* Create modal */}
      <Modal
        title="New Category"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={createCategory.isPending}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={(v) =>
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
        </Form>
      </Modal>

      {/* Edit modal */}
      <Modal
        title={`Edit "${editTarget?.name}"`}
        open={!!editTarget}
        onCancel={() => setEditTarget(null)}
        onOk={() => editForm.submit()}
        confirmLoading={updateCategory.isPending}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(v) => {
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
        </Form>
      </Modal>
    </>
  );
}
