"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Skeleton,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
  App,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HolderOutlined,
  SettingOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

import Link from "next/link";

import { ActivityBadge } from "~/components/ui/activity-badge";
import { ActivityIcon } from "~/components/ui/activity-icon";
import { FormModal } from "~/components/ui/form-modal";
import { toastMutationOptions } from "~/lib/mutation-utils";
import { useCrudModal } from "~/lib/use-crud-modal";
import { formatDurationMins } from "~/lib/insight-utils";
import { ACTIVITY_TYPES, type ActivityType } from "~/lib/activity-types";

interface Props {
  courseId: number;
}

type SectionWithDuration = {
  id: number;
  title: string;
  visible: boolean;
  gradable: boolean;
  durationMins: number;
  durationMode: "manual" | "auto";
  pickCount: number | null;
};

function ActivityList({
  sectionId,
  courseId,
}: {
  sectionId: number;
  courseId: number;
}) {
  const trpc = useTRPC();
  const { message: messageApi, modal } = App.useApp();
  const {
    isOpen,
    openCreate: openAddModal,
    close: closeAddModal,
  } = useCrudModal();
  const [form] = Form.useForm<{ title: string; type: string }>();
  const queryClient = useQueryClient();
  const { token } = theme.useToken();

  const activitiesQuery = trpc.activity.listBySection.queryOptions({
    sectionId,
  });
  const { data: activities = [], isLoading } = useQuery(activitiesQuery);

  const createActivityOptions = trpc.activity.create.mutationOptions({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Activity added!",
      invalidate: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.activity.listBySection.queryKey({ sectionId }),
        }),
      onSuccess: () => {
        closeAddModal();
        form.resetFields();
      },
    }),
  });
  const createActivity = useMutation(createActivityOptions);

  const deleteActivityOptions = trpc.activity.delete.mutationOptions({
    ...toastMutationOptions({
      messageApi,
      successMessage: "Activity deleted.",
      invalidate: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.activity.listBySection.queryKey({ sectionId }),
        }),
    }),
  });
  const deleteActivity = useMutation(deleteActivityOptions);

  return (
    <>
      <div style={{ padding: "0 0 8px" }}>
        {isLoading ? (
          <Space orientation="vertical" style={{ width: "100%" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: token.colorFillAlter,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Skeleton.Avatar active size="small" shape="square" />
                <Skeleton.Input active size="small" style={{ flex: 1 }} />
              </div>
            ))}
          </Space>
        ) : activities.length === 0 ? (
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginBottom: 8 }}
          >
            No activities yet.
          </Typography.Text>
        ) : (
          <Space orientation="vertical" style={{ width: "100%" }}>
            {activities.map((act) => (
              <div
                key={act.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 6,
                  background: token.colorFillAlter,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <ActivityIcon type={act.type} />
                <Typography.Text style={{ flex: 1 }}>
                  {act.title}
                </Typography.Text>
                <ActivityBadge type={act.type} />
                <Link href={`/teach/courses/${courseId}/activities/${act.id}`}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    title="Edit content"
                  />
                </Link>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={deleteActivity.isPending}
                  onClick={() =>
                    modal.confirm({
                      title: "Delete activity?",
                      content: `"${act.title}" will be permanently removed.`,
                      okText: "Delete",
                      okButtonProps: { danger: true },
                      onOk: () => deleteActivity.mutate({ id: act.id }),
                    })
                  }
                />
              </div>
            ))}
          </Space>
        )}

        <Button
          size="small"
          icon={<PlusOutlined />}
          style={{ marginTop: 8 }}
          onClick={openAddModal}
        >
          Add Activity
        </Button>
      </div>

      <FormModal
        form={form}
        title="Add Activity"
        open={isOpen}
        onCancel={() => {
          closeAddModal();
          form.resetFields();
        }}
        confirmLoading={createActivity.isPending}
        onFinish={(v) =>
          createActivity.mutate({
            sectionId,
            title: v.title,
            type: v.type as ActivityType,
            order: 0,
          })
        }
      >
        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
          <Select options={[...ACTIVITY_TYPES]} />
        </Form.Item>
      </FormModal>
    </>
  );
}

function SectionDurationLabel({
  section,
  autoDuration,
}: {
  section: SectionWithDuration;
  autoDuration: number;
}) {
  const effective =
    section.durationMode === "auto" ? autoDuration : section.durationMins;
  return (
    <Space size={4}>
      <ClockCircleOutlined />
      <Typography.Text type="secondary">
        {formatDurationMins(effective)}
        {section.durationMode === "auto" && " (auto)"}
      </Typography.Text>
    </Space>
  );
}

function SectionSettingsDrawer({
  section,
  open,
  onClose,
  courseId,
  autoDuration,
}: {
  section: SectionWithDuration | null;
  open: boolean;
  onClose: () => void;
  courseId: number;
  autoDuration: number;
}) {
  const trpc = useTRPC();
  const { message: messageApi } = App.useApp();
  const [form] = Form.useForm<{
    title: string;
    durationMode: "manual" | "auto";
    durationMins: number | null;
    pickCount: number | null;
  }>();
  const queryClient = useQueryClient();

  const updateSection = useMutation(
    trpc.section.update.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Section settings saved!",
        invalidate: () => {
          void queryClient.invalidateQueries({
            queryKey: trpc.section.listByCourse.queryKey({ courseId }),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.section.getCourseDuration.queryKey({ courseId }),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.section.getAutoDurations.queryKey({ courseId }),
          });
        },
        onSuccess: () => onClose(),
      }),
    }),
  );

  const deleteSection = useMutation(
    trpc.section.delete.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Section deleted.",
        invalidate: () => {
          void queryClient.invalidateQueries({
            queryKey: trpc.section.listByCourse.queryKey({ courseId }),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.section.getCourseDuration.queryKey({ courseId }),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.section.getAutoDurations.queryKey({ courseId }),
          });
        },
      }),
    }),
  );

  const durationMode =
    Form.useWatch("durationMode", form) ?? section?.durationMode ?? "manual";

  const handleFinish = (values: {
    title: string;
    durationMode: "manual" | "auto";
    durationMins: number | null;
    pickCount: number | null;
  }) => {
    if (!section) return;
    updateSection.mutate({
      id: section.id,
      title: values.title,
      durationMode: values.durationMode,
      durationMins:
        values.durationMode === "auto" ? undefined : (values.durationMins ?? 0),
      pickCount: values.pickCount,
    });
  };

  return (
    <Drawer
      title="Section Settings"
      open={open}
      onClose={onClose}
      size={420}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deleteSection.isPending}
            onClick={() => {
              if (section) deleteSection.mutate({ id: section.id });
            }}
          >
            Delete section
          </Button>
          <Button
            type="primary"
            loading={updateSection.isPending}
            onClick={() => form.submit()}
          >
            Save
          </Button>
        </div>
      }
    >
      {section && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            title: section.title,
            durationMode: section.durationMode,
            durationMins:
              section.durationMode === "auto"
                ? autoDuration
                : section.durationMins,
            pickCount: section.pickCount,
          }}
          onFinish={handleFinish}
        >
          <Form.Item name="title" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item label="Duration mode">
            <Form.Item name="durationMode" noStyle>
              <Radio.Group>
                <Radio.Button value="manual">Manual</Radio.Button>
                <Radio.Button value="auto">Auto</Radio.Button>
              </Radio.Group>
            </Form.Item>
            {durationMode === "auto" && (
              <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
                Recommended: {formatDurationMins(autoDuration)}
              </Typography.Text>
            )}
          </Form.Item>

          {durationMode === "manual" && (
            <Form.Item name="durationMins" label="Duration (minutes)">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          )}

          <Form.Item
            name="pickCount"
            label="Randomly pick questions"
            extra="If set, each attempt randomly selects this many questions from the section's quizzes."
          >
            <InputNumber
              min={0}
              placeholder="All questions"
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );
}

function SortableSectionCard({
  section,
  courseId,
  isExpanded,
  onToggle,
  onOpenSettings,
  autoDuration,
}: {
  section: SectionWithDuration;
  courseId: number;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenSettings: () => void;
  autoDuration: number;
}) {
  const { token } = theme.useToken();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    marginBottom: 12,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        size="small"
        styles={{
          body: {
            padding: 0,
          },
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            cursor: "pointer",
            background: isExpanded ? token.colorFillAlter : undefined,
          }}
          onClick={onToggle}
        >
          <span
            {...listeners}
            style={{ cursor: "grab", color: token.colorTextSecondary }}
            onClick={(e) => e.stopPropagation()}
          >
            <HolderOutlined />
          </span>
          <Typography.Text strong style={{ flex: 1 }}>
            {section.title}
          </Typography.Text>
          <Space size={8}>
            {!section.visible && <Tag>Hidden</Tag>}
            {!section.gradable && <Tag color="orange">Not gradable</Tag>}
            <SectionDurationLabel
              section={section}
              autoDuration={autoDuration}
            />
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              title="Section settings"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings();
              }}
            />
          </Space>
        </div>
        {isExpanded && (
          <div style={{ padding: "0 16px 16px" }}>
            <ActivityList sectionId={section.id} courseId={courseId} />
          </div>
        )}
      </Card>
    </div>
  );
}

export function SectionBuilder({ courseId }: Props) {
  const trpc = useTRPC();
  const { message: messageApi } = App.useApp();
  const {
    isOpen: isAddSectionModalOpen,
    openCreate: openAddSectionModal,
    close: closeAddSectionModal,
  } = useCrudModal();
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [settingsSection, setSettingsSection] =
    useState<SectionWithDuration | null>(null);
  const [form] = Form.useForm<{ title: string; gradable?: boolean }>();
  const queryClient = useQueryClient();
  const { token } = theme.useToken();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const { data: sections = [], isLoading } = useQuery(
    trpc.section.listByCourse.queryOptions({
      courseId,
    }),
  );

  const { data: autoDurations = new Map<number, number>() } = useQuery(
    trpc.section.getAutoDurations.queryOptions({ courseId }),
  );

  const { data: totalDuration = 0 } = useQuery(
    trpc.section.getCourseDuration.queryOptions({
      courseId,
    }),
  );

  const createSection = useMutation(
    trpc.section.create.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Section added!",
        invalidate: () => {
          void queryClient.invalidateQueries({
            queryKey: trpc.section.listByCourse.queryKey({ courseId }),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.section.getCourseDuration.queryKey({ courseId }),
          });
          void queryClient.invalidateQueries({
            queryKey: trpc.section.getAutoDurations.queryKey({ courseId }),
          });
        },
        onSuccess: () => {
          closeAddSectionModal();
          form.resetFields();
        },
      }),
    }),
  );

  const reorderSections = useMutation(
    trpc.section.reorder.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Section order updated!",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.section.listByCourse.queryKey({ courseId }),
          }),
      }),
    }),
  );

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved!);

    reorderSections.mutate({
      courseId,
      order: reordered.map((s, index) => ({ id: s.id, order: index })),
    });
  };

  return (
    <>
      <Space
        orientation="vertical"
        size="large"
        style={{ width: "100%", marginBottom: 16 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Typography.Title level={5} style={{ margin: 0 }}>
            Sections ({sections.length})
          </Typography.Title>
          <Space>
            <ClockCircleOutlined />
            <Typography.Text strong>
              Total duration: {formatDurationMins(totalDuration)}
            </Typography.Text>
          </Space>
        </div>

        {isLoading ? (
          <Space orientation="vertical" style={{ width: "100%" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 6,
                  background: token.colorFillAlter,
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Skeleton.Input active size="small" style={{ flex: 1 }} />
                <Skeleton.Button active size="small" />
                <Skeleton.Button active size="small" />
              </div>
            ))}
          </Space>
        ) : sections.length === 0 ? (
          <Empty description="No sections yet" style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAddSectionModal}
            >
              Add First Section
            </Button>
          </Empty>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sectionIds}
              strategy={verticalListSortingStrategy}
            >
              {sections.map((sec) => (
                <SortableSectionCard
                  key={sec.id}
                  section={sec as SectionWithDuration}
                  courseId={courseId}
                  isExpanded={expandedSection === sec.id}
                  onToggle={() =>
                    setExpandedSection((current) =>
                      current === sec.id ? null : sec.id,
                    )
                  }
                  onOpenSettings={() => setSettingsSection(sec)}
                  autoDuration={autoDurations.get(sec.id) ?? 0}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        <Button
          type="dashed"
          block
          icon={<PlusOutlined />}
          onClick={openAddSectionModal}
        >
          Add Section
        </Button>
      </Space>

      <FormModal
        form={form}
        title="Add Section"
        open={isAddSectionModalOpen}
        onCancel={() => {
          closeAddSectionModal();
          form.resetFields();
        }}
        confirmLoading={createSection.isPending}
        onFinish={(v) =>
          createSection.mutate({
            courseId,
            title: v.title,
            order: sections.length,
            gradable: v.gradable ?? true,
          })
        }
      >
        <Form.Item
          name="title"
          label="Section Title"
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="gradable"
          label="Gradable"
          valuePropName="checked"
          initialValue
        >
          <Switch checkedChildren="Gradable" unCheckedChildren="Not gradable" />
        </Form.Item>
      </FormModal>

      <SectionSettingsDrawer
        section={settingsSection}
        open={settingsSection != null}
        onClose={() => setSettingsSection(null)}
        courseId={courseId}
        autoDuration={
          settingsSection ? (autoDurations.get(settingsSection.id) ?? 0) : 0
        }
      />
    </>
  );
}
