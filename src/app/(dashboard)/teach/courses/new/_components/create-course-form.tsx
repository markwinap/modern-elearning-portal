"use client";

import { Button, Form, Input, InputNumber, Select, App } from "antd";
import { useRouter } from "next/navigation";

import { api } from "~/trpc/react";
import { CoverImageUpload } from "~/components/ui/cover-image-upload";

interface Category {
  id: number;
  name: string;
}

interface Props {
  categories: Category[];
}

interface FormValues {
  title: string;
  description: string;
  categoryId: number;
  coverImageUrl: string;
  maxEnrollments: number;
  locationType: "online" | "onsite";
  siteLocation: string;
  classroom: string;
  instructorBio: string;
  accessKey: string;
}

export function CreateCourseForm({ categories }: Props) {
  const [form] = Form.useForm<FormValues>();
  const locationType = Form.useWatch<"online" | "onsite">("locationType", form);
  const { message } = App.useApp();
  const router = useRouter();

  const createCourse = api.course.create.useMutation({
    onSuccess: (course) => {
      void message.success("Course created!");
      router.push(`/teach/courses/${course!.id}/edit`);
    },
    onError: (err) => void message.error(err.message),
  });

  return (
    <>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ locationType: "online" }}
        onFinish={(v) =>
          createCourse.mutate({
            ...v,
            maxEnrollments: v.maxEnrollments ?? undefined,
            coverImageUrl: v.coverImageUrl || undefined,
            siteLocation: v.siteLocation || undefined,
            classroom: v.classroom || undefined,
            instructorBio: v.instructorBio || undefined,
          })
        }
      >
        <Form.Item
          name="title"
          label="Course Title"
          rules={[{ required: true, min: 1 }]}
        >
          <Input placeholder="e.g. Introduction to TypeScript" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={4} placeholder="What will students learn?" />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="Category"
          rules={[{ required: true, message: "Select a category" }]}
        >
          <Select
            placeholder="Select category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>

        <Form.Item name="coverImageUrl" label="Cover Image">
          <CoverImageUpload />
        </Form.Item>

        <Form.Item
          name="locationType"
          label="Location Type"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: "online", label: "Online" },
              { value: "onsite", label: "On-Site" },
            ]}
          />
        </Form.Item>

        {locationType === "onsite" && (
          <>
            <Form.Item name="siteLocation" label="Site Location">
              <Input placeholder="e.g. Main Campus, Building A" />
            </Form.Item>

            <Form.Item name="classroom" label="Classroom">
              <Input placeholder="e.g. Room 101" />
            </Form.Item>
          </>
        )}

        <Form.Item name="instructorBio" label="Instructor Bio">
          <Input.TextArea
            rows={3}
            placeholder="Optional bio / qualifications"
          />
        </Form.Item>

        <Form.Item name="maxEnrollments" label="Max Enrollments (optional)">
          <InputNumber
            min={1}
            style={{ width: "100%" }}
            placeholder="Leave blank for unlimited"
          />
        </Form.Item>

        <Form.Item name="accessKey" label="Access Key (optional)">
          <Input placeholder="Leave blank for open enrollment" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createCourse.isPending}
          >
            Create Course
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
