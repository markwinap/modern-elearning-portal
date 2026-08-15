"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import { useTRPC, type RouterOutputs } from "~/trpc/react";
import { FormModal } from "~/components/ui/form-modal";
import { MarkdownPreview } from "~/components/ui/markdown-preview";
import { type WorkshopPhase } from "~/lib/activity-content";

type Rubric = RouterOutputs["workshop"]["listRubrics"][number];
type Submission = RouterOutputs["workshop"]["listSubmissions"][number];
type Assessment = RouterOutputs["workshop"]["getAssessments"][number];

interface Props {
  activityId: number;
}

const PHASES = [
  { value: "setup", label: "Setup" },
  { value: "submission", label: "Submission" },
  { value: "assessment", label: "Assessment" },
  { value: "grading", label: "Grading" },
  { value: "closed", label: "Closed" },
];

interface AssessmentFormValues {
  scores: Record<string, number>;
  feedback: string;
}

function formatDateForInput(d: Date): string {
  const year = d.getFullYear().toString().padStart(4, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseInputDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export function WorkshopEditor({ activityId }: Props) {
  const trpc = useTRPC();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const { data: workshop } = useQuery(
    trpc.workshop.getWorkshop.queryOptions({ activityId }),
  );
  const { data: rubrics = [] } = useQuery(
    trpc.workshop.listRubrics.queryOptions({ workshopActivityId: activityId }),
  );
  const { data: submissions = [] } = useQuery(
    trpc.workshop.listSubmissions.queryOptions({
      workshopActivityId: activityId,
    }),
  );

  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [assessOpen, setAssessOpen] = useState(false);
  const [assessForm] = Form.useForm<AssessmentFormValues>();

  const [rubricForm] = Form.useForm<{
    id?: number;
    criterion: string;
    description?: string;
    maxPoints: number;
    order: number;
  }>();

  const [rubricModalOpen, setRubricModalOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);

  const upsertWorkshop = useMutation(
    trpc.workshop.upsertWorkshop.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.workshop.getWorkshop.queryKey({ activityId }),
        });
        void messageApi.success("Workshop settings saved!");
      },
      onError: (err: { message: string }) => void messageApi.error(err.message),
    }),
  );

  const addRubric = useMutation(
    trpc.workshop.addRubric.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.workshop.listRubrics.queryKey({
            workshopActivityId: activityId,
          }),
        });
        void messageApi.success("Rubric saved!");
        closeRubricModal();
      },
      onError: (err: { message: string }) => void messageApi.error(err.message),
    }),
  );

  const updateRubric = useMutation(
    trpc.workshop.updateRubric.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.workshop.listRubrics.queryKey({
            workshopActivityId: activityId,
          }),
        });
        void messageApi.success("Rubric updated!");
        closeRubricModal();
      },
      onError: (err: { message: string }) => void messageApi.error(err.message),
    }),
  );

  const deleteRubric = useMutation(
    trpc.workshop.deleteRubric.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.workshop.listRubrics.queryKey({
            workshopActivityId: activityId,
          }),
        });
        void messageApi.success("Rubric deleted.");
      },
      onError: (err: { message: string }) => void messageApi.error(err.message),
    }),
  );

  const submitAssessment = useMutation(
    trpc.workshop.submitAssessment.mutationOptions({
      onSuccess: () => {
        if (selectedSubmission) {
          void queryClient.invalidateQueries({
            queryKey: trpc.workshop.getAssessments.queryKey({
              submissionId: selectedSubmission.id,
            }),
          });
        }
        void messageApi.success("Assessment submitted!");
        setAssessOpen(false);
        assessForm.resetFields();
      },
      onError: (err: { message: string }) => void messageApi.error(err.message),
    }),
  );

  const { data: assessments = [] } = useQuery({
    ...trpc.workshop.getAssessments.queryOptions({
      submissionId: selectedSubmission?.id ?? 0,
    }),
    enabled: !!selectedSubmission,
  });

  function closeRubricModal() {
    setRubricModalOpen(false);
    setEditingRubric(null);
    rubricForm.resetFields();
  }

  function openRubricCreate() {
    setEditingRubric(null);
    rubricForm.resetFields();
    rubricForm.setFieldsValue({
      criterion: "",
      description: "",
      maxPoints: 5,
      order: rubrics.length,
    });
    setRubricModalOpen(true);
  }

  function openRubricEdit(rubric: Rubric) {
    setEditingRubric(rubric);
    rubricForm.setFieldsValue({
      id: rubric.id,
      criterion: rubric.criterion,
      description: rubric.description ?? "",
      maxPoints: rubric.maxPoints,
      order: rubric.order,
    });
    setRubricModalOpen(true);
  }

  function handleRubricSave(values: {
    id?: number;
    criterion: string;
    description?: string;
    maxPoints: number;
    order: number;
  }) {
    if (editingRubric) {
      updateRubric.mutate({
        id: editingRubric.id,
        criterion: values.criterion,
        description: values.description,
        maxPoints: values.maxPoints,
        order: values.order,
      });
    } else {
      addRubric.mutate({
        workshopActivityId: activityId,
        criterion: values.criterion,
        description: values.description,
        maxPoints: values.maxPoints,
        order: values.order,
      });
    }
  }

  function openAssess(submission: Submission) {
    setSelectedSubmission(submission);
    setAssessOpen(true);
    assessForm.resetFields();
    const scores: Record<string, number> = {};
    for (const rubric of rubrics) {
      scores[rubric.id.toString()] = 0;
    }
    assessForm.setFieldsValue({ scores, feedback: "" });
  }

  function handleAssess(values: AssessmentFormValues) {
    if (!selectedSubmission || !rubrics.length) return;
    const scores = rubrics.reduce<Record<string, number>>((acc, r) => {
      const score = values.scores[r.id.toString()] ?? 0;
      acc[r.id.toString()] = Math.min(score, r.maxPoints);
      return acc;
    }, {});
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    submitAssessment.mutate({
      submissionId: selectedSubmission.id,
      scores,
      feedback: values.feedback,
      totalScore,
    });
  }

  const initialSettings = workshop
    ? {
        phase: workshop.phase,
        submissionDeadline: workshop.submissionDeadline
          ? formatDateForInput(new Date(workshop.submissionDeadline))
          : null,
        assessmentDeadline: workshop.assessmentDeadline
          ? formatDateForInput(new Date(workshop.assessmentDeadline))
          : null,
        maxSubmissions: workshop.maxSubmissions,
        peerAssessmentsRequired: workshop.peerAssessmentsRequired,
        teacherWeighting: workshop.teacherWeighting,
        peerWeighting: workshop.peerWeighting,
      }
    : {
        phase: "setup",
        submissionDeadline: null,
        assessmentDeadline: null,
        maxSubmissions: 1,
        peerAssessmentsRequired: 3,
        teacherWeighting: 50,
        peerWeighting: 50,
      };

  function handleSaveSettings(values: {
    phase: string;
    submissionDeadline: string | null;
    assessmentDeadline: string | null;
    maxSubmissions: number;
    peerAssessmentsRequired: number;
    teacherWeighting: number;
    peerWeighting: number;
  }) {
    upsertWorkshop.mutate({
      activityId,
      phase: values.phase as WorkshopPhase,
      submissionDeadline: parseInputDate(
        values.submissionDeadline ?? undefined,
      ),
      assessmentDeadline: parseInputDate(
        values.assessmentDeadline ?? undefined,
      ),
      maxSubmissions: values.maxSubmissions,
      peerAssessmentsRequired: values.peerAssessmentsRequired,
      teacherWeighting: values.teacherWeighting,
      peerWeighting: values.peerWeighting,
    });
  }

  return (
    <>
      {contextHolder}
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        <Card
          title={<Typography.Text strong>Workshop Settings</Typography.Text>}
        >
          <Form
            initialValues={initialSettings}
            onFinish={handleSaveSettings}
            layout="vertical"
          >
            <Space wrap>
              <Form.Item
                label="Phase"
                name="phase"
                rules={[{ required: true }]}
              >
                <Select options={PHASES} style={{ width: 160 }} />
              </Form.Item>
              <Form.Item label="Submission deadline" name="submissionDeadline">
                <Input type="datetime-local" />
              </Form.Item>
              <Form.Item label="Assessment deadline" name="assessmentDeadline">
                <Input type="datetime-local" />
              </Form.Item>
              <Form.Item
                label="Max submissions"
                name="maxSubmissions"
                rules={[{ required: true, min: 1, type: "number" }]}
              >
                <InputNumber min={1} />
              </Form.Item>
              <Form.Item
                label="Peer assessments required"
                name="peerAssessmentsRequired"
                rules={[{ required: true, min: 0, type: "number" }]}
              >
                <InputNumber min={0} />
              </Form.Item>
              <Form.Item
                label="Teacher weighting %"
                name="teacherWeighting"
                rules={[{ required: true, min: 0, max: 100, type: "number" }]}
              >
                <InputNumber min={0} max={100} />
              </Form.Item>
              <Form.Item
                label="Peer weighting %"
                name="peerWeighting"
                rules={[{ required: true, min: 0, max: 100, type: "number" }]}
              >
                <InputNumber min={0} max={100} />
              </Form.Item>
            </Space>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={upsertWorkshop.isPending}
              >
                Save settings
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card
          title={<Typography.Text strong>Rubrics</Typography.Text>}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openRubricCreate}
            >
              Add rubric
            </Button>
          }
        >
          <Table<Rubric>
            dataSource={rubrics}
            rowKey="id"
            pagination={false}
            columns={[
              { title: "Criterion", dataIndex: "criterion" },
              { title: "Description", dataIndex: "description" },
              { title: "Max points", dataIndex: "maxPoints" },
              {
                title: "Actions",
                render: (_, record) => (
                  <Space>
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openRubricEdit(record)}
                    >
                      Edit
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => deleteRubric.mutate({ id: record.id })}
                    >
                      Delete
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        <Card
          title={
            <Typography.Text strong>
              Submissions &amp; Assessments
            </Typography.Text>
          }
        >
          <Table<Submission>
            dataSource={submissions}
            rowKey="id"
            pagination={false}
            columns={[
              {
                title: "Student",
                render: (_, record) => record.userId,
              },
              {
                title: "Submitted",
                render: (_, record) =>
                  record.submittedAt
                    ? new Date(record.submittedAt).toLocaleString()
                    : "—",
              },
              {
                title: "Content",
                render: (_, record) => (
                  <Typography.Text ellipsis style={{ maxWidth: 300 }}>
                    {record.content}
                  </Typography.Text>
                ),
              },
              {
                title: "Actions",
                render: (_, record) => (
                  <Space>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setSelectedSubmission(record)}
                    >
                      View
                    </Button>
                    <Button size="small" onClick={() => openAssess(record)}>
                      Assess
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      </Space>

      <FormModal
        title={editingRubric ? "Edit rubric" : "Add rubric"}
        open={rubricModalOpen}
        onCancel={closeRubricModal}
        form={rubricForm}
        onFinish={handleRubricSave}
        confirmLoading={
          editingRubric ? updateRubric.isPending : addRubric.isPending
        }
      >
        <Form.Item
          label="Criterion"
          name="criterion"
          rules={[{ required: true, message: "Criterion is required" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item
          label="Max points"
          name="maxPoints"
          rules={[{ required: true, min: 1, type: "integer" }]}
        >
          <InputNumber min={1} />
        </Form.Item>
        <Form.Item
          label="Order"
          name="order"
          rules={[{ required: true, type: "integer" }]}
        >
          <InputNumber />
        </Form.Item>
      </FormModal>

      <Modal
        title="Assess submission"
        open={assessOpen}
        onCancel={() => setAssessOpen(false)}
        onOk={() => assessForm.submit()}
        confirmLoading={submitAssessment.isPending}
        width={720}
      >
        {selectedSubmission && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Card title="Submission content">
              <MarkdownPreview source={selectedSubmission.content} />
            </Card>
            <Form form={assessForm} onFinish={handleAssess} layout="vertical">
              {rubrics.map((rubric) => (
                <Form.Item
                  key={rubric.id}
                  label={`${rubric.criterion} (max ${rubric.maxPoints})`}
                  name={["scores", rubric.id.toString()]}
                  rules={[{ required: true, type: "integer", min: 0 }]}
                >
                  <InputNumber min={0} max={rubric.maxPoints} />
                </Form.Item>
              ))}
              <Form.Item label="Feedback" name="feedback">
                <Input.TextArea rows={4} />
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>

      <Modal
        title="Submission"
        open={!!selectedSubmission && !assessOpen}
        onCancel={() => setSelectedSubmission(null)}
        footer={null}
        width={720}
      >
        {selectedSubmission && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <MarkdownPreview source={selectedSubmission.content} />
            <Typography.Text type="secondary">
              Submitted{" "}
              {new Date(selectedSubmission.submittedAt).toLocaleString()}
            </Typography.Text>
            <Table<Assessment>
              dataSource={assessments.filter(
                (a) => a.submissionId === selectedSubmission.id,
              )}
              rowKey="id"
              pagination={false}
              columns={[
                {
                  title: "Assessor",
                  render: (_, record) => record.assessorId,
                },
                {
                  title: "Total score",
                  render: (_, record) => record.totalScore ?? "—",
                },
                {
                  title: "Feedback",
                  render: (_, record) => record.feedback ?? "—",
                },
              ]}
            />
          </Space>
        )}
      </Modal>
    </>
  );
}
