"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  App,
} from "antd";
import { CheckOutlined, InboxOutlined } from "@ant-design/icons";

import { CoverImageUpload } from "~/components/ui/cover-image-upload";
import { StatusBadge } from "~/components/ui/status-badge";
import { CourseSessionManager } from "./course-session-manager";

interface Course {
  id: number;
  title: string;
  description: string | null;
  categoryId: number;
  coverImageUrl: string | null;
  maxEnrollments: number | null;
  accessKey: string | null;
  teacherId: string;
  locationType: "online" | "onsite";
  siteLocation: string | null;
  classroom: string | null;
  instructorBio: string | null;
  status: string;
}

interface Category {
  id: number;
  name: string;
}

interface Teacher {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

interface Props {
  course: Course;
  categories: Category[];
  teachers: Teacher[];
}

interface FormValues {
  title: string;
  description: string;
  categoryId: number;
  coverImageUrl: string;
  maxEnrollments: number;
  teacherId: string;
  locationType: "online" | "onsite";
  siteLocation: string;
  classroom: string;
  instructorBio: string;
  accessKey: string;
}

export function EditCourseForm({ course, categories, teachers }: Props) {
  const trpc = useTRPC();
  const [form] = Form.useForm<FormValues>();
  const locationType = Form.useWatch<"online" | "onsite">("locationType", form);
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const updateCourse = useMutation(trpc.course.update.mutationOptions({
    onSuccess: () => {
      void message.success("Course updated!");
      void queryClient.invalidateQueries({ queryKey: trpc.course.getMyCourses.queryKey() });
    },
    onError: (err) => void message.error(err.message),
  }));

  const publishCourse = useMutation(trpc.course.publish.mutationOptions({
    onSuccess: () => {
      void message.success("Course published!");
      void queryClient.invalidateQueries({ queryKey: trpc.course.getMyCourses.queryKey() });
    },
    onError: (err) => void message.error(err.message),
  }));

  const archiveCourse = useMutation(trpc.course.archive.mutationOptions({
    onSuccess: () => {
      void message.success("Course archived.");
      void queryClient.invalidateQueries({ queryKey: trpc.course.getMyCourses.queryKey() });
    },
    onError: (err) => void message.error(err.message),
  }));

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Space>
          <StatusBadge status={course.status} />
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
          teacherId: course.teacherId,
          locationType: course.locationType,
          siteLocation: course.siteLocation ?? "",
          classroom: course.classroom ?? "",
          instructorBio: course.instructorBio ?? "",
          maxEnrollments: course.maxEnrollments,
          accessKey: course.accessKey ?? "",
        }}
        onFinish={(values) =>
          updateCourse.mutate({
            id: course.id,
            ...values,
            maxEnrollments: values.maxEnrollments ?? undefined,
            coverImageUrl: values.coverImageUrl || undefined,
            siteLocation: values.siteLocation || undefined,
            classroom: values.classroom || undefined,
            instructorBio: values.instructorBio || undefined,
          })
        }
      >
        <Form.Item
          name="title"
          label="Course Title"
          rules={[{ required: true, min: 1 }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="teacherId"
          label="Instructor"
          rules={[{ required: true, message: "Select an instructor" }]}
        >
          <Select
            options={teachers.map((t) => ({
              value: t.id,
              label: t.name ? `${t.name} (${t.email ?? t.id})` : t.id,
            }))}
          />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="Category"
          rules={[{ required: true }]}
        >
          <Select
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

        <Form.Item name="maxEnrollments" label="Max Enrollments">
          <InputNumber
            min={1}
            style={{ width: "100%" }}
            placeholder="Unlimited"
          />
        </Form.Item>

        <Form.Item name="accessKey" label="Access Key">
          <Input placeholder="Leave blank for open enrollment" />
        </Form.Item>

        <Divider />

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={updateCourse.isPending}
          >
            Save Changes
          </Button>
        </Form.Item>
      </Form>

      {course.locationType === "onsite" && (
        <CourseSessionManager courseId={course.id} />
      )}
    </>
  );
}
