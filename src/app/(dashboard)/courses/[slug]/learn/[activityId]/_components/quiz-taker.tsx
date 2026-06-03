"use client";

import { useState, useEffect, useRef } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Progress,
  Radio,
  Space,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

interface QuizConfig {
  timeLimitSecs: number | null;
  maxAttempts: number | null;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showFeedback: boolean;
}

interface Question {
  id: number;
  type: string;
  prompt: string;
  options: unknown;
  points: number;
  order: number;
}

interface Props {
  activityId: number;
  quiz: QuizConfig | null;
  questions: Question[];
  initialProgress: { status: string; completedAt: Date | null } | null;
  onComplete: () => void;
}

type AnswerMap = Record<number, unknown>;

interface FeedbackItem {
  questionId: number;
  isCorrect: boolean;
  pointsAwarded: number;
  correctAnswer: unknown;
}

interface QuizResult {
  score: number;
  maxScore: number;
  feedback: FeedbackItem[] | null;
}

export function QuizTaker({ activityId, quiz, questions, initialProgress: _initialProgress, onComplete }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const answersRef = useRef<AnswerMap>({});
  answersRef.current = answers;

  const startAttempt = api.quiz.startAttempt.useMutation({
    onSuccess: (attempt) => { if (attempt) setAttemptId(attempt.id); },
    onError: (err) => messageApi.error(err.message),
  });

  const submitAttempt = api.quiz.submitAttempt.useMutation({
    onSuccess: (res) => {
      setResult(res);
      onComplete();
    },
    onError: (err) => messageApi.error(err.message),
  });

  function handleSubmit() {
    if (!attemptId) return;
    submitAttempt.mutate({
      attemptId,
      answers: Object.entries(answers).map(([qId, answer]) => ({
        questionId: parseInt(qId, 10),
        answer,
      })),
    });
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Start countdown when attempt begins
  useEffect(() => {
    if (!attemptId || !quiz?.timeLimitSecs) return;
    setTimeLeft(quiz.timeLimitSecs);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft !== 0 || !attemptId || result || submitAttempt.isPending) return;
    messageApi.warning("Time's up! Submitting your quiz…");
    submitAttempt.mutate({
      attemptId,
      answers: Object.entries(answersRef.current).map(([qId, answer]) => ({
        questionId: parseInt(qId, 10),
        answer,
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  if (result) {
    const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
    const passed = pct >= 70;
    return (
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        {contextHolder}
        <Card>
          <Space orientation="vertical" style={{ width: "100%", textAlign: "center" }} size="large">
            <CheckCircleOutlined style={{ fontSize: 64, color: passed ? "#52c41a" : "#ff4d4f" }} />
            <Typography.Title level={3} style={{ margin: 0 }}>Quiz Complete!</Typography.Title>
            <Progress
              type="circle"
              percent={pct}
              strokeColor={passed ? "#52c41a" : "#ff4d4f"}
              size={120}
            />
            <Typography.Text>
              Score: <strong>{result.score}</strong> / {result.maxScore} points
            </Typography.Text>
            <Tag color={passed ? "success" : "error"} style={{ fontSize: 14, padding: "4px 16px" }}>
              {passed ? "Passed" : "Not Passed"}
            </Tag>
          </Space>
        </Card>

        {result.feedback && result.feedback.length > 0 && (
          <>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Answer Review
            </Typography.Title>
            {questions.map((q, index) => {
              const fb = result.feedback!.find((f) => f.questionId === q.id);
              if (!fb) return null;
              return (
                <Card
                  key={q.id}
                  size="small"
                  title={
                    <Space>
                      <Tag color="blue">Q{index + 1}</Tag>
                      {fb.isCorrect ? (
                        <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: token.colorError }} />
                      )}
                      <Tag color={fb.isCorrect ? "success" : "error"}>
                        {fb.pointsAwarded} / {q.points} pt{q.points !== 1 ? "s" : ""}
                      </Tag>
                    </Space>
                  }
                >
                  <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                    {q.prompt}
                  </Typography.Text>
                  {!fb.isCorrect && fb.correctAnswer != null && (
                    <Alert
                      type="info"
                      message={
                        <span>
                          Correct answer:{" "}
                          <strong>
                            {typeof fb.correctAnswer === "string"
                              ? fb.correctAnswer
                              : JSON.stringify(fb.correctAnswer)}
                          </strong>
                        </span>
                      }
                      style={{ marginTop: 8 }}
                    />
                  )}
                </Card>
              );
            })}
          </>
        )}
      </Space>
    );
  }

  if (!attemptId) {
    return (
      <Card>
        {contextHolder}
        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            Quiz Overview
          </Typography.Title>

          <Descriptions column={2} size="small">
            <Descriptions.Item label="Questions">{questions.length}</Descriptions.Item>
            <Descriptions.Item label="Total Points">
              {questions.reduce((s, q) => s + q.points, 0)}
            </Descriptions.Item>
            {quiz?.timeLimitSecs && (
              <Descriptions.Item label={<><ClockCircleOutlined /> Time Limit</>}>
                {formatTime(quiz.timeLimitSecs)}
              </Descriptions.Item>
            )}
            {quiz?.maxAttempts && (
              <Descriptions.Item label="Max Attempts">{quiz.maxAttempts}</Descriptions.Item>
            )}
          </Descriptions>

          {questions.length === 0 ? (
            <Alert type="warning" title="No questions have been added to this quiz yet." showIcon />
          ) : (
            <Button
              type="primary"
              size="large"
              loading={startAttempt.isPending}
              onClick={() => startAttempt.mutate({ activityId })}
            >
              Start Quiz
            </Button>
          )}
        </Space>
      </Card>
    );
  }

  return (
    <>
      {contextHolder}
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        {timeLeft !== null && (
          <Alert
            type={timeLeft < 60 ? "error" : timeLeft < 300 ? "warning" : "info"}
            title={
              <Space>
                <ClockCircleOutlined />
                <span>
                  Time Remaining: <strong>{formatTime(timeLeft)}</strong>
                </span>
              </Space>
            }
          />
        )}
        {questions.map((q, index) => (
          <Card
            key={q.id}
            title={
              <Space>
                <Tag color="blue">Q{index + 1}</Tag>
                <span>{q.points} pt{q.points !== 1 ? "s" : ""}</span>
              </Space>
            }
          >
            <Typography.Text strong style={{ display: "block", marginBottom: 12, fontSize: 15 }}>
              {q.prompt}
            </Typography.Text>

            {(q.type === "multiple_choice" || q.type === "true_false") && (
              <Radio.Group
                value={answers[q.id]}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value as string }))}
              >
                <Space orientation="vertical">
                  {q.type === "true_false"
                    ? [
                      <Radio key="true" value="true">True</Radio>,
                      <Radio key="false" value="false">False</Radio>,
                    ]
                    : Array.isArray(q.options)
                      ? (q.options as string[]).map((opt, i) => (
                        <Radio key={i} value={opt}>
                          {opt}
                        </Radio>
                      ))
                      : null}
                </Space>
              </Radio.Group>
            )}

            {(q.type === "short_answer" ||
              q.type === "fill_blank" ||
              q.type === "matching" ||
              q.type === "ordering") && (
                <Input
                  placeholder="Your answer…"
                  value={(answers[q.id] as string) ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                />
              )}

            {q.type === "essay" && (
              <Input.TextArea
                rows={4}
                placeholder="Write your answer…"
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              />
            )}
          </Card>
        ))}

        <Button
          type="primary"
          size="large"
          loading={submitAttempt.isPending}
          onClick={handleSubmit}
          style={{ marginTop: 8 }}
        >
          Submit Quiz
        </Button>
      </Space>
    </>
  );
}
