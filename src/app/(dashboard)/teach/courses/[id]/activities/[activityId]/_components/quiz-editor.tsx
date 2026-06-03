"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

const QUESTION_TYPES = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "essay", label: "Essay" },
] as const;

// Question types that support automatic grading via a stored correct answer
const AUTO_ASSESSED_TYPES = new Set(["multiple_choice", "true_false", "short_answer", "fill_blank"]);

interface Question {
  id: number;
  type: string;
  prompt: string;
  options: unknown;
  correctAnswer: unknown;
  points: number;
  order: number;
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
  correctAnswer?: string;
}

interface SettingsFormValues {
  timeLimitSecs: number | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showFeedback: boolean;
}

export function QuizEditor({ activityId, initialSettings, initialQuestions }: Props) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionForm] = Form.useForm<QuestionFormValues>();
  const [settingsForm] = Form.useForm<SettingsFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [questionType, setQuestionType] = useState("multiple_choice");
  const utils = api.useUtils();

  const watchedOptions = Form.useWatch<string>("options", questionForm);
  const parsedOptions =
    typeof watchedOptions === "string"
      ? watchedOptions.split("\n").map((o) => o.trim()).filter(Boolean)
      : [];

  const upsertQuiz = api.quiz.upsertQuiz.useMutation({
    onSuccess: () => messageApi.success("Quiz settings saved!"),
    onError: (err) => messageApi.error(err.message),
  });

  const createQuestion = api.quiz.createQuestion.useMutation({
    onSuccess: (newQ) => {
      if (newQ) {
        setQuestions((prev) => [...prev, newQ]);
      }
      void utils.quiz.listQuestions.invalidate({ activityId });
      closeQuestionModal();
      messageApi.success("Question added!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const updateQuestion = api.quiz.updateQuestion.useMutation({
    onSuccess: () => {
      void utils.quiz.listQuestions.invalidate({ activityId });
      closeQuestionModal();
      messageApi.success("Question updated!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const deleteQuestion = api.quiz.deleteQuestion.useMutation({
    onSuccess: (_, variables) => {
      setQuestions((prev) => prev.filter((q) => q.id !== variables.id));
      messageApi.success("Question removed.");
    },
    onError: (err) => messageApi.error(err.message),
  });

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
    setQuestionModalOpen(false);
    setEditingQuestion(null);
    questionForm.resetFields();
    setQuestionType("multiple_choice");
  }

  function openEditModal(q: Question) {
    setEditingQuestion(q);
    const optionsStr = Array.isArray(q.options)
      ? (q.options as string[]).join("\n")
      : "";
    const correctAnswerStr =
      typeof q.correctAnswer === "string"
        ? q.correctAnswer
        : q.correctAnswer != null
          ? JSON.stringify(q.correctAnswer)
          : undefined;
    questionForm.setFieldsValue({
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      options: optionsStr,
      correctAnswer: correctAnswerStr,
    });
    setQuestionType(q.type);
    setQuestionModalOpen(true);
  }

  function handleQuestionSubmit(values: QuestionFormValues) {
    const options =
      values.type === "multiple_choice" && values.options
        ? values.options.split("\n").map((o) => o.trim()).filter(Boolean)
        : undefined;
    const type = values.type as "multiple_choice" | "true_false" | "short_answer" | "fill_blank" | "matching" | "ordering" | "essay";
    const correctAnswer =
      AUTO_ASSESSED_TYPES.has(values.type) && values.correctAnswer
        ? values.correctAnswer
        : undefined;

    if (editingQuestion) {
      updateQuestion.mutate({
        id: editingQuestion.id,
        type,
        prompt: values.prompt,
        options,
        correctAnswer,
        points: values.points,
      });
    } else {
      createQuestion.mutate({
        quizActivityId: activityId,
        type,
        prompt: values.prompt,
        options,
        correctAnswer,
        points: values.points,
        order: questions.length,
      });
    }
  }

  return (
    <>
      {contextHolder}
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
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
              <InputNumber min={0} placeholder="No limit" style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="maxAttempts" label="Max Attempts" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: 200 }} />
            </Form.Item>
            <Form.Item name="shuffleQuestions" valuePropName="checked">
              <Checkbox>Shuffle questions</Checkbox>
            </Form.Item>
            <Form.Item name="shuffleAnswers" valuePropName="checked">
              <Checkbox>Shuffle answers</Checkbox>
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
            <Button icon={<PlusOutlined />} onClick={() => { setEditingQuestion(null); setQuestionModalOpen(true); }}>
              Add Question
            </Button>
          }
        >
          {questions.length === 0 ? (
            <Typography.Text type="secondary">No questions yet. Add one to get started.</Typography.Text>
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
                    borderBottom: index < questions.length - 1 ? "1px solid rgba(0,0,0,0.06)" : undefined,
                  }}
                >
                  <Space align="start">
                    <Tag style={{ marginTop: 2 }}>{index + 1}</Tag>
                    <div>
                      <Typography.Text strong style={{ display: "block" }}>{q.prompt}</Typography.Text>
                      <Space size="small">
                        <Tag color="blue">{q.type.replace("_", " ")}</Tag>
                        <Typography.Text type="secondary">{q.points} pt{q.points !== 1 ? "s" : ""}</Typography.Text>
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

      <Modal
        title={editingQuestion ? "Edit Question" : "Add Question"}
        open={questionModalOpen}
        onCancel={closeQuestionModal}
        onOk={() => questionForm.submit()}
        confirmLoading={createQuestion.isPending || updateQuestion.isPending}
        width={600}
      >
        <Form
          form={questionForm}
          layout="vertical"
          initialValues={{ type: "multiple_choice", points: 1 }}
          onFinish={handleQuestionSubmit}
        >
          <Form.Item name="type" label="Question Type" rules={[{ required: true }]}>
            <Select
              options={[...QUESTION_TYPES]}
              onChange={(v) => {
                setQuestionType(v as string);
                questionForm.setFieldValue("correctAnswer", undefined);
              }}
            />
          </Form.Item>
          <Form.Item name="prompt" label="Question Prompt" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Enter the question text…" />
          </Form.Item>
          {questionType === "multiple_choice" && (
            <Form.Item
              name="options"
              label="Answer Options"
              extra="Enter one option per line"
              rules={[{ required: true, message: "Provide at least one option" }]}
            >
              <Input.TextArea rows={4} placeholder={"Option A\nOption B\nOption C"} />
            </Form.Item>
          )}
          {questionType === "multiple_choice" && (
            <Form.Item
              name="correctAnswer"
              label="Correct Answer"
              extra="Must match one of the options above exactly"
            >
              <Select
                options={parsedOptions.map((o) => ({ value: o, label: o }))}
                placeholder="Select correct option"
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
        </Form>
      </Modal>

      <Divider />
    </>
  );
}
