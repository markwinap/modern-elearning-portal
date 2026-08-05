"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { seededShuffle } from "~/lib/quiz-utils";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
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
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

interface QuizConfig {
  timeLimitSecs: number | null;
  maxAttempts: number | null;
  questionsPerAttempt: number | null;
  oneQuestionAtATime: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showFeedback: boolean;
  feedbackMode: "immediate" | "after_last_attempt" | "after_due_date" | "never";
  availableUntil: Date | null;
}

interface Question {
  id: number;
  type: string;
  prompt: string;
  options: unknown;
  allowMultiple: boolean;
  points: number;
  order: number;
}

function QuestionCard({
  question: q,
  index,
  value,
  options,
  onChange,
}: {
  question: Question;
  index: number;
  value: unknown;
  options: string[];
  onChange: (value: unknown) => void;
}) {
  return (
    <Card
      key={q.id}
      title={
        <Space>
          <Tag color="blue">Q{index + 1}</Tag>
          <span>
            {q.points} pt{q.points !== 1 ? "s" : ""}
          </span>
        </Space>
      }
    >
      <Typography.Text
        strong
        style={{ display: "block", marginBottom: 12, fontSize: 15 }}
      >
        {q.prompt}
      </Typography.Text>

      {options.length > 0 &&
        (q.type === "matching" ||
          q.type === "ordering" ||
          q.type === "fill_blank") && (
          <Space wrap style={{ marginBottom: 12 }}>
            {options.map((opt, i) => (
              <Tag key={i}>{opt}</Tag>
            ))}
          </Space>
        )}

      {q.type === "multiple_choice" && q.allowMultiple && (
        <Checkbox.Group
          value={(value as string[]) ?? []}
          onChange={(checked) => onChange(checked)}
        >
          <Space orientation="vertical">
            {options.map((opt, i) => (
              <Checkbox key={i} value={opt}>
                {opt}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      )}

      {((q.type === "multiple_choice" && !q.allowMultiple) ||
        q.type === "true_false") && (
        <Radio.Group
          value={value}
          onChange={(e) => onChange(e.target.value as string)}
        >
          <Space orientation="vertical">
            {q.type === "true_false"
              ? [
                  <Radio key="true" value="true">
                    True
                  </Radio>,
                  <Radio key="false" value="false">
                    False
                  </Radio>,
                ]
              : options.map((opt, i) => (
                  <Radio key={i} value={opt}>
                    {opt}
                  </Radio>
                ))}
          </Space>
        </Radio.Group>
      )}

      {(q.type === "short_answer" ||
        q.type === "fill_blank" ||
        q.type === "matching" ||
        q.type === "ordering") && (
        <Input
          placeholder="Your answer…"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {q.type === "essay" && (
        <Input.TextArea
          rows={4}
          placeholder="Write your answer…"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Card>
  );
}

interface Props {
  activityId: number;
  quiz: QuizConfig | null;
  questions: Question[];
  initialProgress: { status: string; completedAt: Date | null } | null;
  completionType: string;
  completionGrade: number | null;
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

export function QuizTaker({
  activityId,
  quiz,
  questions,
  initialProgress: _initialProgress,
  completionType,
  completionGrade,
  onComplete,
}: Props) {
  const trpc = useTRPC();
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [attemptQuestionIds, setAttemptQuestionIds] = useState<number[] | null>(
    null,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const answersRef = useRef<AnswerMap>({});
  answersRef.current = answers;

  // If the attempt has a sampled subset, use that order. Otherwise shuffle all
  // questions when the quiz is configured to do so.
  const displayQuestions = useMemo(() => {
    if (attemptQuestionIds) {
      const orderMap = new Map(attemptQuestionIds.map((id, i) => [id, i]));
      return questions
        .filter((q) => orderMap.has(q.id))
        .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    }
    if (!attemptId || !quiz?.shuffleQuestions) return questions;
    return seededShuffle(questions, attemptId);
  }, [attemptQuestionIds, attemptId, quiz?.shuffleQuestions, questions]);

  const hasOptions = (q: Question): boolean =>
    Array.isArray(q.options) && q.options.length > 0;

  const optionsByQuestionId = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const q of questions) {
      const opts = hasOptions(q) ? (q.options as string[]) : [];
      map.set(
        q.id,
        attemptId && quiz?.shuffleAnswers && hasOptions(q)
          ? seededShuffle(opts, attemptId + q.id)
          : opts,
      );
    }
    return map;
  }, [questions, attemptId, quiz?.shuffleAnswers]);

  const { data: attempts } = useQuery(
    trpc.quiz.getMyAttempts.queryOptions({ activityId }),
  );
  const hasInProgress =
    attempts?.some(
      (a: { submittedAt: Date | null }) => a.submittedAt === null,
    ) ?? false;
  const submittedCount =
    attempts?.filter(
      (a: { submittedAt: Date | null }) => a.submittedAt !== null,
    ).length ?? 0;
  const maxAttempts = quiz?.maxAttempts ?? null;
  const unlimited = maxAttempts === null || maxAttempts === 0;
  const remainingAttempts = unlimited
    ? null
    : Math.max(0, maxAttempts - submittedCount);
  const canStart = unlimited || hasInProgress || (remainingAttempts ?? 0) > 0;

  const inProgressAttempt = attempts?.find(
    (a: { submittedAt: Date | null; questionIds: number[] | null }) =>
      a.submittedAt === null,
  );
  const inProgressQuestionIds = inProgressAttempt?.questionIds ?? null;
  const displayQuestionCount =
    inProgressQuestionIds?.length ??
    quiz?.questionsPerAttempt ??
    questions.length;

  const startAttempt = useMutation(
    trpc.quiz.startAttempt.mutationOptions({
      onSuccess: (attempt) => {
        if (attempt) {
          setAttemptId(attempt.id);
          setAttemptQuestionIds(
            Array.isArray(attempt.questionIds) ? attempt.questionIds : null,
          );
          setCurrentQuestionIndex(0);
          setAnswers({});
          setResult(null);
          setTimeLeft(null);
        }
        void queryClient.invalidateQueries({
          queryKey: trpc.quiz.getMyAttempts.queryKey({ activityId }),
        });
      },
      onError: (err) => messageApi.error(err.message),
    }),
  );

  const submitAttempt = useMutation(
    trpc.quiz.submitAttempt.mutationOptions({
      onSuccess: (res) => {
        setResult(res);
        const pct =
          res.maxScore > 0 ? Math.round((res.score / res.maxScore) * 100) : 0;
        const threshold =
          completionType === "grade" ? (completionGrade ?? 70) : 70;
        const passed = pct >= threshold;
        if (completionType !== "grade" || passed) {
          onComplete();
        }
        void queryClient.invalidateQueries({
          queryKey: trpc.quiz.getMyAttempts.queryKey({ activityId }),
        });
      },
      onError: (err) => messageApi.error(err.message),
    }),
  );

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
    if (timeLeft !== 0 || !attemptId || result || submitAttempt.isPending)
      return;
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
    const pct =
      result.maxScore > 0
        ? Math.round((result.score / result.maxScore) * 100)
        : 0;
    const threshold = completionType === "grade" ? (completionGrade ?? 70) : 70;
    const passed = pct >= threshold;
    return (
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        {contextHolder}
        <Card>
          <Space
            orientation="vertical"
            style={{ width: "100%", textAlign: "center" }}
            size="large"
          >
            <CheckCircleOutlined
              style={{ fontSize: 64, color: passed ? "#52c41a" : "#ff4d4f" }}
            />
            <Typography.Title level={3} style={{ margin: 0 }}>
              Quiz Complete!
            </Typography.Title>
            <Progress
              type="circle"
              percent={pct}
              strokeColor={passed ? "#52c41a" : "#ff4d4f"}
              size={120}
            />
            <Typography.Text>
              Score: <strong>{result.score}</strong> / {result.maxScore} points
            </Typography.Text>
            <Tag
              color={passed ? "success" : "error"}
              style={{ fontSize: 14, padding: "4px 16px" }}
            >
              {passed ? "Passed" : "Not Passed"}
            </Tag>
          </Space>
        </Card>

        {canStart && (
          <Button
            type="primary"
            size="large"
            loading={startAttempt.isPending}
            onClick={() => startAttempt.mutate({ activityId })}
          >
            Try Again
          </Button>
        )}

        {result.feedback && result.feedback.length > 0 && (
          <>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Answer Review
            </Typography.Title>
            {displayQuestions.map((q, index) => {
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
                        <CheckCircleOutlined
                          style={{ color: token.colorSuccess }}
                        />
                      ) : (
                        <CloseCircleOutlined
                          style={{ color: token.colorError }}
                        />
                      )}
                      <Tag color={fb.isCorrect ? "success" : "error"}>
                        {fb.pointsAwarded} / {q.points} pt
                        {q.points !== 1 ? "s" : ""}
                      </Tag>
                    </Space>
                  }
                >
                  <Typography.Text
                    strong
                    style={{ display: "block", marginBottom: 8 }}
                  >
                    {q.prompt}
                  </Typography.Text>
                  {!fb.isCorrect && fb.correctAnswer != null && (
                    <Alert
                      type="info"
                      title={
                        <span>
                          Correct answer:{" "}
                          <strong>
                            {typeof fb.correctAnswer === "string"
                              ? fb.correctAnswer
                              : Array.isArray(fb.correctAnswer)
                                ? (fb.correctAnswer as string[]).join(", ")
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

          <Descriptions
            column={2}
            size="small"
            styles={{
              label: { color: token.colorTextSecondary },
              content: { color: token.colorText },
            }}
            items={[
              {
                key: "questions",
                label: "Questions",
                children: displayQuestionCount,
              },
              {
                key: "points",
                label: "Total Points",
                children: questions.reduce((s, q) => s + q.points, 0),
              },
              ...(quiz?.timeLimitSecs
                ? [
                    {
                      key: "time",
                      label: (
                        <>
                          <ClockCircleOutlined /> Time Limit
                        </>
                      ),
                      children: formatTime(quiz.timeLimitSecs),
                    },
                  ]
                : []),
              ...(quiz?.maxAttempts !== null && quiz?.maxAttempts !== undefined
                ? [
                    {
                      key: "attempts",
                      label: "Attempts",
                      children: unlimited
                        ? "Unlimited"
                        : `${submittedCount} / ${maxAttempts} used`,
                    },
                  ]
                : []),
            ]}
          />

          {questions.length === 0 ? (
            <Alert
              type="warning"
              title="No questions have been added to this quiz yet."
              showIcon
            />
          ) : !canStart ? (
            <Alert
              type="warning"
              title="No attempts remaining"
              description={`You have used ${submittedCount} of ${maxAttempts} attempts.`}
              showIcon
            />
          ) : (
            <Button
              type="primary"
              size="large"
              loading={startAttempt.isPending}
              onClick={() => startAttempt.mutate({ activityId })}
            >
              {hasInProgress ? "Resume Quiz" : "Start Quiz"}
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
        {quiz?.oneQuestionAtATime ? (
          displayQuestions.length > 0 && (
            <>
              <Progress
                percent={Math.round(
                  ((currentQuestionIndex + 1) / displayQuestions.length) * 100,
                )}
                size="small"
                format={() =>
                  `${currentQuestionIndex + 1} / ${displayQuestions.length}`
                }
              />
              <QuestionCard
                question={displayQuestions[currentQuestionIndex]!}
                index={currentQuestionIndex}
                value={answers[displayQuestions[currentQuestionIndex]!.id]}
                options={
                  optionsByQuestionId.get(
                    displayQuestions[currentQuestionIndex]!.id,
                  ) ?? []
                }
                onChange={(answer) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [displayQuestions[currentQuestionIndex]!.id]: answer,
                  }))
                }
              />
              <Space>
                <Button
                  disabled={currentQuestionIndex === 0}
                  onClick={() =>
                    setCurrentQuestionIndex((i) => Math.max(0, i - 1))
                  }
                >
                  Previous
                </Button>
                {currentQuestionIndex >= displayQuestions.length - 1 ? (
                  <Button
                    type="primary"
                    size="large"
                    loading={submitAttempt.isPending}
                    onClick={handleSubmit}
                  >
                    Submit Quiz
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    onClick={() =>
                      setCurrentQuestionIndex((i) =>
                        Math.min(displayQuestions.length - 1, i + 1),
                      )
                    }
                  >
                    Next
                  </Button>
                )}
              </Space>
            </>
          )
        ) : (
          <>
            {displayQuestions.map((q, index) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={index}
                value={answers[q.id]}
                options={optionsByQuestionId.get(q.id) ?? []}
                onChange={(answer) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: answer }))
                }
              />
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
          </>
        )}
      </Space>
    </>
  );
}
