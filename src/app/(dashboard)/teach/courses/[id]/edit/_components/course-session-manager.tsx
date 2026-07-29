"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import {
  App,
  Button,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Typography,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";

import { EntityTable } from "~/components/ui/entity-table";
import { FormModal } from "~/components/ui/form-modal";
import { ToolbarRow } from "~/components/ui/toolbar-row";
import { toastMutationOptions } from "~/lib/mutation-utils";
import { useCrudModal } from "~/lib/use-crud-modal";

export interface CourseSession {
  id: number;
  dayOfWeek: number;
  startDate: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  classroom: string | null;
}

interface SessionFormValues {
  dayOfWeek: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  classroom: string;
}

interface Props {
  courseId: number;
}

const DAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function formatTime(time: string) {
  const date = new Date("1970-01-01T" + time);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CourseSessionManager({ courseId }: Props) {
  const trpc = useTRPC();
  const [form] = Form.useForm<SessionFormValues>();
  const {
    isOpen,
    editing,
    openCreate,
    openEdit: openEditModal,
    close,
  } = useCrudModal<CourseSession>();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useQuery(
    trpc.course.session.list.queryOptions({
      courseId,
    }),
  );

  const createSession = useMutation(
    trpc.course.session.create.mutationOptions({
      ...toastMutationOptions({
        messageApi: message,
        successMessage: "Session created.",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.course.session.list.queryKey({ courseId }),
          }),
        onSuccess: () => {
          close();
          form.resetFields();
        },
      }),
    }),
  );

  const updateSession = useMutation(
    trpc.course.session.update.mutationOptions({
      ...toastMutationOptions({
        messageApi: message,
        successMessage: "Session updated.",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.course.session.list.queryKey({ courseId }),
          }),
        onSuccess: () => {
          close();
          form.resetFields();
        },
      }),
    }),
  );

  const deleteSession = useMutation(
    trpc.course.session.delete.mutationOptions({
      ...toastMutationOptions({
        messageApi: message,
        successMessage: "Session deleted.",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.course.session.list.queryKey({ courseId }),
          }),
      }),
    }),
  );

  function openAdd() {
    form.resetFields();
    openCreate();
  }

  function openEdit(session: CourseSession) {
    form.setFieldsValue({
      dayOfWeek: session.dayOfWeek,
      startDate: session.startDate,
      endDate: session.endDate ?? "",
      startTime: session.startTime.slice(0, 5),
      endTime: session.endTime.slice(0, 5),
      location: session.location ?? "",
      classroom: session.classroom ?? "",
    });
    openEditModal(session);
  }

  function handleDelete(session: CourseSession) {
    deleteSession.mutate({ id: session.id });
  }

  function handleFinish(values: SessionFormValues) {
    const payload = {
      dayOfWeek: values.dayOfWeek,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      startTime: values.startTime,
      endTime: values.endTime,
      location: values.location || undefined,
      classroom: values.classroom || undefined,
    };
    if (editing) {
      updateSession.mutate({ id: editing.id, ...payload });
    } else {
      createSession.mutate({ courseId, ...payload });
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <ToolbarRow
        left={
          <Typography.Title level={5} style={{ margin: 0 }}>
            On-Site Sessions
          </Typography.Title>
        }
        right={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add Session
          </Button>
        }
      />
      <EntityTable
        size="small"
        pagination={false}
        dataSource={sessions}
        columns={[
          {
            title: "Day",
            render: (_, record) =>
              DAY_OPTIONS.find((d) => d.value === record.dayOfWeek)?.label ??
              "Unknown",
          },
          {
            title: "Time",
            render: (_, record) =>
              `${formatTime(record.startTime)} - ${formatTime(record.endTime)}`,
          },
          {
            title: "Dates",
            render: (_, record) =>
              record.endDate
                ? `${record.startDate} to ${record.endDate}`
                : record.startDate,
          },
          {
            title: "Location",
            dataIndex: "location",
          },
          {
            title: "Room",
            dataIndex: "classroom",
          },
          {
            title: "Actions",
            render: (_, record) => (
              <Space>
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  onClick={() => openEdit(record)}
                />
                <Popconfirm
                  title="Delete session?"
                  onConfirm={() => handleDelete(record)}
                >
                  <Button icon={<DeleteOutlined />} size="small" danger />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <FormModal
        form={form}
        title={editing ? "Edit Session" : "Add Session"}
        open={isOpen}
        onCancel={close}
        footer={null}
        onFinish={handleFinish}
      >
        <Form.Item
          name="dayOfWeek"
          label="Day"
          rules={[{ required: true, message: "Select a day" }]}
        >
          <Select options={DAY_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="startDate"
          label="Start Date"
          rules={[
            { required: true, message: "Enter a start date" },
            {
              pattern: /^\d{4}-\d{2}-\d{2}$/,
              message: "Use YYYY-MM-DD",
            },
          ]}
        >
          <Input type="date" />
        </Form.Item>
        <Form.Item
          name="endDate"
          label="End Date"
          rules={[
            {
              pattern: /^\d{4}-\d{2}-\d{2}$/,
              message: "Use YYYY-MM-DD",
            },
          ]}
        >
          <Input type="date" />
        </Form.Item>
        <Form.Item
          name="startTime"
          label="Start Time"
          rules={[
            { required: true, message: "Enter a start time" },
            {
              pattern: /^\d{2}:\d{2}$/,
              message: "Use HH:mm",
            },
          ]}
        >
          <Input type="time" />
        </Form.Item>
        <Form.Item
          name="endTime"
          label="End Time"
          rules={[
            { required: true, message: "Enter an end time" },
            {
              pattern: /^\d{2}:\d{2}$/,
              message: "Use HH:mm",
            },
          ]}
        >
          <Input type="time" />
        </Form.Item>
        <Form.Item name="location" label="Location (optional)">
          <Input placeholder="Override course location" />
        </Form.Item>
        <Form.Item name="classroom" label="Classroom (optional)">
          <Input placeholder="Override classroom" />
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={createSession.isPending || updateSession.isPending}
          >
            {editing ? "Update" : "Add"}
          </Button>
        </Form.Item>
      </FormModal>
    </div>
  );
}
