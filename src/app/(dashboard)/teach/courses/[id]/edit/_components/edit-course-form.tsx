"use client";

import { Button, Divider, Form, Input, InputNumber, Select, Space, Tag, App } from "antd";
import { CheckOutlined, InboxOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";
import { CoverImageUpload } from "~/components/ui/cover-image-upload";

interface Course {
  id: number;
  title: string;
  description: string | null;
  categoryId: number;
  coverImageUrl: string | null;
  maxEnrollments: number | null;
  accessKey: string | null;
  status: string;
}

interface Category {
  id: number;
  name: string;
}

interface Props {
  course: Course;
  categories: Category[];
}

interface FormValues {
  title: string;
  description: string;
  categoryId: number;
  coverImageUrl: string;
  maxEnrollments: number;
  accessKey: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "default",
  published: "success",
  archived: "warning",
};

export function EditCourseForm({ course, categories }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();
  const utils = api.useUtils();

  const updateCourse = api.course.update.useMutation({
    onSuccess: () => {
      void message.success("Course updated!");
      void utils.course.getMyCourses.invalidate();
    },
    onError: (err) => void message.error(err.message),
  });

  const publishCourse = api.course.publish.useMutation({
    onSuccess: () => {
      void message.success("Course published!");
      void utils.course.getMyCourses.invalidate();
    },
    onError: (err) => void message.error(err.message),
  });

  const archiveCourse = api.course.archive.useMutation({
    onSuccess: () => {
      void message.success("Course archived.");
      void utils.course.getMyCourses.invalidate();
    },
    onError: (err) => void message.error(err.message),
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Space>
          <Tag color={STATUS_COLORS[course.status] ?? "default"}>{course.status}</Tag>
        </Space>
        <Space>
          {course.status === "draft" && (
            <Button
              icon={<CheckOutlined />}
              type="primary"
              loading={publishCourse.isPending}
              onClick={() => publishCourse.mutate({ id: course.id })}
            >
              Publish
            </Button>
          )}
          {course.status === "published" && (
            <Button
              icon={<InboxOutlined />}
              loading={archiveCourse.isPending}
              onClick={() => archiveCourse.mutate({ id: course.id })}
            >
              Archive
            </Button>
          )}
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          title: course.title,
          description: course.description ?? "",
          categoryId: course.categoryId,
          coverImageUrl: course.coverImageUrl ?? undefined,
          maxEnrollments: course.maxEnrollments,
          accessKey: course.accessKey ?? "",
        }}
        onFinish={(values) =>
          updateCourse.mutate({
            id: course.id,
            ...values,
            maxEnrollments: values.maxEnrollments ?? undefined,
            coverImageUrl: values.coverImageUrl || undefined,
          })
        }
      >
        <Form.Item name="title" label="Course Title" rules={[{ required: true, min: 1 }]}>
          <Input />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
          <Select options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        </Form.Item>

        <Form.Item name="coverImageUrl" label="Cover Image">
          <CoverImageUpload />
        </Form.Item>

        <Form.Item name="maxEnrollments" label="Max Enrollments">
          <InputNumber min={1} style={{ width: "100%" }} placeholder="Unlimited" />
        </Form.Item>

        <Form.Item name="accessKey" label="Access Key">
          <Input placeholder="Leave blank for open enrollment" />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={updateCourse.isPending}>
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
