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
  Slider,
  Space,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";

import { useTRPC } from "~/trpc/react";

interface CourseOption {
  id: number;
  title: string;
}

interface SkillOption {
  id: number;
  name: string;
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
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FormValues>();

  const { data: paths = [] } = useQuery(trpc.learningPath.list.queryOptions());
  const create = useMutation(
    trpc.learningPath.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries();
        void message.success("Learning path created");
        setOpen(false);
        form.resetFields();
      },
      onError: (error) => void message.error(error.message),
    }),
  );

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Button type="primary" onClick={() => setOpen(true)}>
        New learning path
      </Button>
      <List
        dataSource={paths}
        renderItem={(path) => (
          <List.Item>
            <Typography.Text strong>{path.title}</Typography.Text>
            <Tag>{path.status}</Tag>
            {path.targetRole && <Tag>Target role: {path.targetRole}</Tag>}
          </List.Item>
        )}
      />
      <Modal
        title="Create learning path"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={720}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ status: "draft", courseIds: [], skillTargets: {} }}
          onFinish={(v: FormValues) => create.mutate(v)}
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
          <Button type="primary" htmlType="submit" loading={create.isPending}>
            Create path
          </Button>
        </Form>
      </Modal>
    </Space>
  );
}
