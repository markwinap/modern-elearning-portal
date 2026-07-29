"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Space,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";


interface Props {
  courseId: number;
}

interface CategoryFormValues {
  name: string;
  weight: number;
  order: number;
}

export function CategoryManager({ courseId }: Props) {
  const trpc = useTRPC();
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<CategoryFormValues>();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } =
    useQuery(trpc.gradebook.listCategories.queryOptions({ courseId }));

  const totalWeight = useMemo(
    () => (categories ?? []).reduce((sum, c) => sum + c.weight, 0),
    [categories],
  );
  const remainingWeight = Math.max(0, 100 - totalWeight);

  const createCategory = useMutation(trpc.gradebook.createCategory.mutationOptions({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.gradebook.listCategories.queryKey({ courseId }) });
      void queryClient.invalidateQueries({ queryKey: trpc.gradebook.getCourseGradeSummary.queryKey({ courseId }) });
      form.resetFields();
      messageApi.success("Category added");
    },
    onError: (err) => messageApi.error(err.message),
  }));

  const deleteCategory = useMutation(trpc.gradebook.deleteCategory.mutationOptions({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: trpc.gradebook.listCategories.queryKey({ courseId }) });
      void queryClient.invalidateQueries({ queryKey: trpc.gradebook.getCourseGradeSummary.queryKey({ courseId }) });
      messageApi.success("Category deleted");
    },
    onError: (err) => messageApi.error(err.message),
  }));

  return (
    <>
      {contextHolder}
      <Button onClick={() => setOpen(true)}>Categories</Button>
      <Modal
        title="Grade Categories"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={640}
      >
        <Space orientation="vertical" style={{ width: "100%" }} size="large">
          <Card size="small" title="Add Category">
            <Form
              form={form}
              layout="vertical"
              onFinish={(v) =>
                createCategory.mutate({
                  courseId,
                  name: v.name,
                  weight: v.weight,
                  order: v.order,
                })
              }
            >
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item
                name="weight"
                label="Weight (%)"
                initialValue={remainingWeight}
                rules={[{ required: true }]}
                help={`Total weight used: ${totalWeight}%. Remaining: ${remainingWeight}%.`}
              >
                <InputNumber
                  min={0}
                  max={remainingWeight}
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <Form.Item
                name="order"
                label="Order"
                initialValue={0}
                rules={[{ required: true }]}
              >
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                htmlType="submit"
                loading={createCategory.isPending}
              >
                Add Category
              </Button>
            </Form>
          </Card>

          <List
            dataSource={categories}
            loading={isLoading}
            renderItem={(cat) => (
              <List.Item
                actions={[
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deleteCategory.isPending}
                    onClick={() => deleteCategory.mutate({ id: cat.id })}
                  >
                    Delete
                  </Button>,
                ]}
              >
                <Space>
                  <Typography.Text strong>{cat.name}</Typography.Text>
                  <Typography.Text type="secondary">
                    {cat.weight}%
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    order {cat.order}
                  </Typography.Text>
                </Space>
              </List.Item>
            )}
          />
        </Space>
      </Modal>
    </>
  );
}
