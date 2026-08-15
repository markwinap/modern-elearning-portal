"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";

import { useTRPC, type RouterOutputs } from "~/trpc/react";
import { MarkdownEditor } from "~/components/ui/markdown-editor";
import { MarkdownPreview } from "~/components/ui/markdown-preview";

type PeerSubmission = RouterOutputs["workshop"]["listPeerSubmissions"][number];
type OwnAssessment = RouterOutputs["workshop"]["getAssessments"][number];

interface Props {
  activityId: number;
  isCompleted: boolean;
  onComplete: () => void;
}

export function WorkshopViewer({ activityId, isCompleted, onComplete }: Props) {
  const trpc = useTRPC();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");

  const [assessOpen, setAssessOpen] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState<PeerSubmission | null>(null);
  const [assessForm] = Form.useForm<{
    scores: Record<string, number>;
    feedback: string;
  }>();

  const { data: workshop } = useQuery(
    trpc.workshop.getWorkshop.queryOptions({ activityId }),
  );
  const { data: rubrics = [] } = useQuery(
    trpc.workshop.listRubrics.queryOptions({ workshopActivityId: activityId }),
  );
  const { data: ownSubmissions = [] } = useQuery(
    trpc.workshop.listSubmissions.queryOptions({
      workshopActivityId: activityId,
    }),
  );
  const { data: peerSubmissions = [] } = useQuery({
    ...trpc.workshop.listPeerSubmissions.queryOptions({
      workshopActivityId: activityId,
    }),
    enabled:
      workshop?.phase === "assessment" &&
      (workshop.peerAssessmentsRequired ?? 0) > 0,
  });

  const submit = useMutation(
    trpc.workshop.submit.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.workshop.listSubmissions.queryKey({
            workshopActivityId: activityId,
          }),
        });
        void messageApi.success("Submission saved!");
        setSubmitting(false);
        setContent("");
        onComplete();
      },
      onError: (err: { message: string }) => {
        void messageApi.error(err.message);
        setSubmitting(false);
      },
    }),
  );

  const submitAssessment = useMutation(
    trpc.workshop.submitAssessment.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.workshop.listPeerSubmissions.queryKey({
            workshopActivityId: activityId,
          }),
        });
        if (selectedPeer) {
          void queryClient.invalidateQueries({
            queryKey: trpc.workshop.getAssessments.queryKey({
              submissionId: selectedPeer.id,
            }),
          });
        }
        void messageApi.success("Assessment submitted!");
        setAssessOpen(false);
        setSelectedPeer(null);
        assessForm.resetFields();
      },
      onError: (err: { message: string }) => {
        void messageApi.error(err.message);
      },
    }),
  );

  const selectedOwnSubmission = ownSubmissions[0] ?? null;
  const { data: ownAssessments = [] } = useQuery({
    ...trpc.workshop.getAssessments.queryOptions({
      submissionId: selectedOwnSubmission?.id ?? 0,
    }),
    enabled: !!selectedOwnSubmission,
  });

  function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    submit.mutate({ workshopActivityId: activityId, content });
  }

  function openAssess(peer: PeerSubmission) {
    setSelectedPeer(peer);
    setAssessOpen(true);
    const scores: Record<string, number> = {};
    for (const rubric of rubrics) {
      scores[rubric.id.toString()] = 0;
    }
    assessForm.setFieldsValue({ scores, feedback: "" });
  }

  function handleAssess(values: {
    scores: Record<string, number>;
    feedback: string;
  }) {
    if (!selectedPeer || !rubrics.length) return;
    const scores = rubrics.reduce<Record<string, number>>((acc, r) => {
      const score = values.scores[r.id.toString()] ?? 0;
      acc[r.id.toString()] = Math.min(score, r.maxPoints);
      return acc;
    }, {});
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    submitAssessment.mutate({
      submissionId: selectedPeer.id,
      scores,
      feedback: values.feedback,
      totalScore,
    });
  }

  const canSubmit =
    workshop?.phase === "submission" &&
    ownSubmissions.length < (workshop?.maxSubmissions ?? 1);

  return (
    <>
      {contextHolder}
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <Space wrap>
            <Tag color="blue">Phase: {workshop?.phase ?? "setup"}</Tag>
            {workshop?.submissionDeadline && (
              <Typography.Text type="secondary">
                Submission deadline:{" "}
                {new Date(workshop.submissionDeadline).toLocaleString()}
              </Typography.Text>
            )}
          </Space>

          <Table
            dataSource={rubrics}
            rowKey="id"
            pagination={false}
            columns={[
              { title: "Criterion", dataIndex: "criterion" },
              { title: "Description", dataIndex: "description" },
              { title: "Max points", dataIndex: "maxPoints" },
            ]}
          />

          {workshop?.phase === "submission" && canSubmit && (
            <Card title="Submit your work">
              <Space direction="vertical" style={{ width: "100%" }}>
                <MarkdownEditor markdown={content} onChange={setContent} />
                <Button
                  type="primary"
                  onClick={handleSubmit}
                  loading={submitting || submit.isPending}
                >
                  Submit
                </Button>
              </Space>
            </Card>
          )}

          {workshop?.phase === "submission" && !canSubmit && (
            <Empty description="Submission is closed or you have reached the maximum number of submissions." />
          )}

          {selectedOwnSubmission && (
            <Card title="Your submission">
              <Typography.Text type="secondary">
                Submitted{" "}
                {new Date(selectedOwnSubmission.submittedAt).toLocaleString()}
              </Typography.Text>
              <MarkdownPreview source={selectedOwnSubmission.content} />

              {isCompleted && (
                <Typography.Text type="success">
                  Marked as completed.
                </Typography.Text>
              )}

              <Typography.Title level={5}>Feedback</Typography.Title>
              <Table<OwnAssessment>
                dataSource={ownAssessments}
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
            </Card>
          )}

          {workshop?.phase === "assessment" &&
            (workshop.peerAssessmentsRequired ?? 0) > 0 && (
              <Card title="Assess peer submissions">
                <Table<PeerSubmission>
                  dataSource={peerSubmissions}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    {
                      title: "Submitted",
                      render: (_, record) =>
                        record.submittedAt
                          ? new Date(record.submittedAt).toLocaleString()
                          : "—",
                    },
                    {
                      title: "Actions",
                      render: (_, record) => (
                        <Button onClick={() => openAssess(record)}>
                          Assess
                        </Button>
                      ),
                    },
                  ]}
                />
              </Card>
            )}
        </Space>
      </Card>

      <Modal
        title="Assess peer submission"
        open={assessOpen}
        onCancel={() => setAssessOpen(false)}
        onOk={() => assessForm.submit()}
        confirmLoading={submitAssessment.isPending}
        width={720}
      >
        {selectedPeer && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <Card title="Submission content">
              <MarkdownPreview source={selectedPeer.content} />
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
    </>
  );
}
