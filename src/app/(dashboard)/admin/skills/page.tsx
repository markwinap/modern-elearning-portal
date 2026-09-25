"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { useState } from "react";

import { useTRPC } from "~/trpc/react";

interface FormValues {
  name: string;
  description?: string;
  categoryId?: number | null;
}

interface CategoryFormValues {
  name: string;
  description?: string;
  parentId?: number | null;
}

export default function SkillsAdminPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [skillOpen, setSkillOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const { data: { skills, categories } = { skills: [], categories: [] } } =
    useQuery(trpc.skill.listWithCategories.queryOptions());

  const createSkill = useMutation(
    trpc.skill.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
        void message.success("Skill created");
        setSkillOpen(false);
      },
      onError: (error) => void message.error(error.message),
    }),
  );

  const createCategory = useMutation(
    trpc.skill.createCategory.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
        void message.success("Category created");
        setCategoryOpen(false);
      },
      onError: (error) => void message.error(error.message),
    }),
  );

  return (
    <main>
      <h1>Skills taxonomy</h1>
      <Space>
        <Button type="primary" onClick={() => setSkillOpen(true)}>
          Add skill
        </Button>
        <Button onClick={() => setCategoryOpen(true)}>Add category</Button>
      </Space>
      <List
        dataSource={skills}
        renderItem={(skill) => (
          <List.Item>
            <Typography.Text strong>{skill.name}</Typography.Text>
            {skill.description && (
              <Typography.Text type="secondary"> — {skill.description}</Typography.Text>
            )}
            <span>
              Category: {" "}
              {categories.find((c) => c.id === skill.categoryId)?.name ??
                "None"}
            </span>
          </List.Item>
        )}
      />
      <Modal
        title="Add skill"
        open={skillOpen}
        onCancel={() => setSkillOpen(false)}
        footer={null}
      >
        <Form onFinish={(v: FormValues) => createSkill.mutate(v)}>
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
          <Button type="primary" htmlType="submit" loading={createSkill.isPending}>
            Create
          </Button>
        </Form>
      </Modal>
      <Modal
        title="Add category"
        open={categoryOpen}
        onCancel={() => setCategoryOpen(false)}
        footer={null}
      >
        <Form onFinish={(v: CategoryFormValues) => createCategory.mutate(v)}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="parentId" label="Parent category">
            <Select
              allowClear
              options={categories.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={createCategory.isPending}>
            Create
          </Button>
        </Form>
      </Modal>
    </main>
  );
}
