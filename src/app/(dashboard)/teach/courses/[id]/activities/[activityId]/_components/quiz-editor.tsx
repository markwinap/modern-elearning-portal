"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";

import { useState } from "react";
import {
  App,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
} from "@ant-design/icons";

import { FormModal } from "~/components/ui/form-modal";
import { formatDurationMins } from "~/lib/insight-utils";
import { toastMutationOptions } from "~/lib/mutation-utils";
import { useCrudModal } from "~/lib/use-crud-modal";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "essay", label: "Essay" },
] as const;

// Question types that support automatic grading via a stored correct answer
const AUTO_ASSESSED_TYPES = new Set([
  "multiple_choice",
  "true_false",
  "short_answer",
  "fill_blank",
]);

interface Question {
  id: number;
  type: string;
  prompt: string;
  options: unknown;
  correctAnswer: unknown;
  allowMultiple: boolean;
  points: number;
  order: number;
  recommendedTimeMins?: number;
}

interface QuizSettings {
  timeLimitSecs: number | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showFeedback: boolean;
}

interface Props {
  activityId: number;
  initialSettings: QuizSettings | null;
  initialQuestions: Question[];
}

interface QuestionFormValues {
  type: string;
  prompt: string;
  points: number;
  options: string;
  correctAnswer?: string | string[];
  allowMultiple?: boolean;
  recommendedTimeMins: number;
}

interface SettingsFormValues {
  timeLimitSecs: number | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showFeedback: boolean;
}

export function QuizEditor({
  activityId,
  initialSettings,
  initialQuestions,
}: Props) {
  const trpc = useTRPC();
  const { data: recommendedDuration } = useQuery(
    trpc.quiz.getRecommendedDuration.queryOptions({ activityId }),
  );
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const {
    isOpen: questionModalOpen,
    editing: editingQuestion,
    openCreate: openCreateQuestionModal,
    openEdit: openEditQuestionModal,
    close: closeQuestionModalState,
  } = useCrudModal<Question>();
  const [questionForm] = Form.useForm<QuestionFormValues>();
  const [settingsForm] = Form.useForm<SettingsFormValues>();
  const { message: messageApi } = App.useApp();
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const queryClient = useQueryClient();

  const watchedOptions = Form.useWatch<string>("options", questionForm);
  const parsedOptions =
    typeof watchedOptions === "string"
      ? watchedOptions
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
      : [];

  const upsertQuiz = useMutation(
    trpc.quiz.upsertQuiz.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Quiz settings saved!",
      }),
    }),
  );

  const createQuestion = useMutation(
    trpc.quiz.createQuestion.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Question added!",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.quiz.listQuestions.queryKey({ activityId }),
          }),
        onSuccess: (newQ) => {
          if (newQ) {
            setQuestions((prev) => [...prev, newQ]);
          }
          closeQuestionModal();
        },
      }),
    }),
  );

  const updateQuestion = useMutation(
    trpc.quiz.updateQuestion.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Question updated!",
        invalidate: () =>
          queryClient.invalidateQueries({
            queryKey: trpc.quiz.listQuestions.queryKey({ activityId }),
          }),
        onSuccess: (updated) => {
          if (updated) {
            setQuestions((prev) =>
              prev.map((q) => (q.id === updated.id ? updated : q)),
            );
          }
          closeQuestionModal();
        },
      }),
    }),
  );

  const deleteQuestion = useMutation(
    trpc.quiz.deleteQuestion.mutationOptions({
      ...toastMutationOptions({
        messageApi,
        successMessage: "Question removed.",
        onSuccess: (_data, variables) => {
          setQuestions((prev) => prev.filter((q) => q.id !== variables.id));
        },
      }),
    }),
  );

  function handleSaveSettings(values: SettingsFormValues) {
    upsertQuiz.mutate({
      activityId,
      timeLimitSecs: values.timeLimitSecs ?? undefined,
      maxAttempts: values.maxAttempts,
      shuffleQuestions: values.shuffleQuestions,
      shuffleAnswers: values.shuffleAnswers,
      showFeedback: values.showFeedback,
    });
  }

  function closeQuestionModal() {
    closeQuestionModalState();
    questionForm.resetFields();
    setQuestionType("multiple_choice");
    setAllowMultiple(false);
  }

  function openEditModal(q: Question) {
    const optionsStr = Array.isArray(q.options)
      ? (q.options as string[]).join("\n")
      : "";
    const correctAnswerValue: string | string[] | undefined = Array.isArray(
      q.correctAnswer,
    )
      ? (q.correctAnswer as string[])
      : typeof q.correctAnswer === "string"
        ? q.correctAnswer
        : q.correctAnswer != null
          ? JSON.stringify(q.correctAnswer)
          : undefined;
    questionForm.setFieldsValue({
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      options: optionsStr,
      correctAnswer: correctAnswerValue,
      allowMultiple: q.allowMultiple,
      recommendedTimeMins: q.recommendedTimeMins ?? 1,
    });
    setQuestionType(q.type);
    setAllowMultiple(q.allowMultiple);
    openEditQuestionModal(q);
  }

  function handleQuestionSubmit(values: QuestionFormValues) {
    const options =
      values.type === "multiple_choice" && values.options
        ? values.options
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;
    const type = values.type as
      | "multiple_choice"
      | "true_false"
      | "short_answer"
      | "fill_blank"
      | "matching"
      | "ordering"
      | "essay";
    const correctAnswer =
      AUTO_ASSESSED_TYPES.has(values.type) &&
      values.correctAnswer &&
      values.correctAnswer.length > 0
        ? values.correctAnswer
        : undefined;
    const allowMultipleValue =
      values.type === "multiple_choice" ? !!values.allowMultiple : false;

    if (editingQuestion) {
      updateQuestion.mutate({
        id: editingQuestion.id,
        type,
        prompt: values.prompt,
        options,
        correctAnswer,
        allowMultiple: allowMultipleValue,
        points: values.points,
        recommendedTimeMins: values.recommendedTimeMins,
      });
    } else {
      createQuestion.mutate({
        quizActivityId: activityId,
        type,
        prompt: values.prompt,
        options,
        correctAnswer,
        allowMultiple: allowMultipleValue,
        points: values.points,
        order: questions.length,
        recommendedTimeMins: values.recommendedTimeMins,
      });
    }
  }

  return (
    <>
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        {/* Recommended Duration */}
        {recommendedDuration && recommendedDuration.recommendedMins > 0 && (
          <Card size="small">
            <Space>
              <ClockCircleOutlined />
              <Typography.Text>
                Recommended duration (from questions):{" "}
                <Typography.Text strong>
                  {formatDurationMins(recommendedDuration.recommendedMins)}
                </Typography.Text>
              </Typography.Text>
              {initialSettings?.timeLimitSecs && (
                <Typography.Text type="secondary">
                  | Manual limit:{" "}
                  {formatDurationMins(
                    Math.ceil(initialSettings.timeLimitSecs / 60),
                  )}
                </Typography.Text>
              )}
            </Space>
          </Card>
        )}

        {/* Settings */}
        <Card title={<Typography.Text strong>Quiz Settings</Typography.Text>}>
          <Form
            form={settingsForm}
            layout="vertical"
            initialValues={{
              timeLimitSecs: initialSettings?.timeLimitSecs ?? null,
              maxAttempts: initialSettings?.maxAttempts ?? 1,
              shuffleQuestions: initialSettings?.shuffleQuestions ?? false,
              shuffleAnswers: initialSettings?.shuffleAnswers ?? false,
              showFeedback: initialSettings?.showFeedback ?? true,
            }}
            onFinish={handleSaveSettings}
          >
            <Form.Item name="timeLimitSecs" label="Time Limit (seconds)">
              <InputNumber
                min={0}
                placeholder="No limit"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item
              name="maxAttempts"
              label="Max Attempts (0 = unlimited)"
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0}
                placeholder="Unlimited"
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item
              name="shuffleQuestions"
              valuePropName="checked"
              extra="Randomizes the order questions are presented in for each attempt"
            >
              <Checkbox>Shuffle questions</Checkbox>
            </Form.Item>
            <Form.Item
              name="shuffleAnswers"
              valuePropName="checked"
              extra="Randomizes the order of answer options for multiple choice questions"
            >
              <Checkbox>Shuffle answer options</Checkbox>
            </Form.Item>
            <Form.Item name="showFeedback" valuePropName="checked">
              <Checkbox>Show feedback after submission</Checkbox>
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={upsertQuiz.isPending}
              >
                Save Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* Questions */}
        <Card
          title={
            <Space>
              <Typography.Text strong>Questions</Typography.Text>
              <Tag>{questions.length}</Tag>
            </Space>
          }
          extra={
            <Button icon={<PlusOutlined />} onClick={openCreateQuestionModal}>
              Add Question
            </Button>
          }
        >
          {questions.length === 0 ? (
            <Typography.Text type="secondary">
              No questions yet. Add one to get started.
            </Typography.Text>
          ) : (
            <Space orientation="vertical" style={{ width: "100%" }} size={0}>
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom:
                      index < questions.length - 1
                        ? "1px solid rgba(0,0,0,0.06)"
                        : undefined,
                  }}
                >
                  <Space align="start">
                    <Tag style={{ marginTop: 2 }}>{index + 1}</Tag>
                    <div>
                      <Typography.Text strong style={{ display: "block" }}>
                        {q.prompt}
                      </Typography.Text>
                      <Space size="small">
                        <Tag color="blue">{q.type.replace("_", " ")}</Tag>
                        {q.type === "multiple_choice" && q.allowMultiple && (
                          <Tag color="purple">multi-select</Tag>
                        )}
                        <Typography.Text type="secondary">
                          {q.points} pt{q.points !== 1 ? "s" : ""}
                        </Typography.Text>
                      </Space>
                    </div>
                  </Space>
                  <Space size="small">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(q)}
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={deleteQuestion.isPending}
                      onClick={() => deleteQuestion.mutate({ id: q.id })}
                    />
                  </Space>
                </div>
              ))}
            </Space>
          )}
        </Card>
      </Space>

      <FormModal
        form={questionForm}
        title={editingQuestion ? "Edit Question" : "Add Question"}
        open={questionModalOpen}
        onCancel={closeQuestionModal}
        confirmLoading={createQuestion.isPending || updateQuestion.isPending}
        width={600}
        initialValues={{
          type: "multiple_choice",
          points: 1,
          recommendedTimeMins: 1,
        }}
        onFinish={handleQuestionSubmit}
      >
        <Form.Item
          name="type"
          label="Question Type"
          rules={[{ required: true }]}
        >
          <Select
            options={[...QUESTION_TYPES]}
            onChange={(v) => {
              setQuestionType(v as string);
              setAllowMultiple(false);
              questionForm.setFieldValue("correctAnswer", undefined);
              questionForm.setFieldValue("allowMultiple", false);
            }}
          />
        </Form.Item>
        <Form.Item
          name="prompt"
          label="Question Prompt"
          rules={[{ required: true }]}
        >
          <Input.TextArea rows={3} placeholder="Enter the question text…" />
        </Form.Item>
        {questionType === "multiple_choice" && (
          <Form.Item
            name="options"
            label="Answer Options"
            extra="Enter one option per line"
            rules={[{ required: true, message: "Provide at least one option" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder={"Option A\nOption B\nOption C"}
            />
          </Form.Item>
        )}
        {questionType === "multiple_choice" && (
          <Form.Item name="allowMultiple" valuePropName="checked">
            <Checkbox
              onChange={(e) => {
                setAllowMultiple(e.target.checked);
                questionForm.setFieldValue("correctAnswer", undefined);
              }}
            >
              Allow multiple correct answers (students select via checkboxes)
            </Checkbox>
          </Form.Item>
        )}
        {questionType === "multiple_choice" && (
          <Form.Item
            name="correctAnswer"
            label="Correct Answer"
            extra={
              allowMultiple
                ? "Select every option that counts as correct"
                : "Must match one of the options above exactly"
            }
          >
            <Select
              mode={allowMultiple ? "multiple" : undefined}
              options={parsedOptions.map((o) => ({ value: o, label: o }))}
              placeholder={
                allowMultiple
                  ? "Select correct options"
                  : "Select correct option"
              }
              allowClear
              notFoundContent="Enter options above first"
            />
          </Form.Item>
        )}
        {questionType === "true_false" && (
          <Form.Item name="correctAnswer" label="Correct Answer">
            <Select
              options={[
                { value: "true", label: "True" },
                { value: "false", label: "False" },
              ]}
              placeholder="Select correct answer"
              allowClear
            />
          </Form.Item>
        )}
        {(questionType === "short_answer" || questionType === "fill_blank") && (
          <Form.Item
            name="correctAnswer"
            label="Expected Answer"
            extra="Student answer must match exactly (case-sensitive)"
          >
            <Input placeholder="Enter expected answer" />
          </Form.Item>
        )}
        <Form.Item name="points" label="Points" rules={[{ required: true }]}>
          <InputNumber min={1} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item
          name="recommendedTimeMins"
          label="Recommended Time (minutes)"
          extra="Estimated time a student should spend on this question."
        >
          <InputNumber min={0} style={{ width: 120 }} />
        </Form.Item>
      </FormModal>

      <Divider />
    </>
  );
}
