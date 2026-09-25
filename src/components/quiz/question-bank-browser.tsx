"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";

import { QuestionBankImporter } from "~/components/quiz/question-bank-importer";
import { useTRPC } from "~/trpc/react";

interface Props {
  quizActivityId?: number;
}
interface Values {
  prompt: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  tags?: string;
  points: number;
}

export function QuestionBankBrowser({ quizActivityId }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [randomCount, setRandomCount] = useState<number | null>(null);
  const [form] = Form.useForm<Values>();
  const { data = [], isLoading } = useQuery(
    trpc.questionBank.list.queryOptions({ search }),
  );
  const create = useMutation(
    trpc.questionBank.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.questionBank.list.queryKey(),
        });
        setOpen(false);
        form.resetFields();
        message.success("Question created");
      },
      onError: (error) => message.error(error.message),
    }),
  );
  const remove = useMutation(
    trpc.questionBank.delete.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: trpc.questionBank.list.queryKey(),
        }),
    }),
  );
  const add = useMutation(
    trpc.questionBank.addToQuiz.mutationOptions({
      onSuccess: ({ added }) => {
        message.success(`Added ${added} questions`);
        setSelected([]);
        if (quizActivityId)
          void queryClient.invalidateQueries({
            queryKey: trpc.quiz.listQuestions.queryKey({
              activityId: quizActivityId,
            }),
          });
      },
    }),
  );
  function submit(values: Values) {
    create.mutate({
      type: "short_answer",
      prompt: values.prompt,
      correctAnswer: values.answer,
      difficulty: values.difficulty,
      tags:
        values.tags
          ?.split(",")
          .map((tag) => tag.trim())
          .filter(Boolean) ?? [],
      points: values.points,
      recommendedTimeMins: 1,
      allowMultiple: false,
    });
  }
  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Card>
        <Space wrap>
          <Input.Search
            aria-label="Search questions"
            placeholder="Search questions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 300 }}
          />
          <Button type="primary" onClick={() => setOpen(true)}>
            New question
          </Button>
          <QuestionBankImporter />
          {quizActivityId && (
            <>
              <InputNumber
                min={1}
                max={selected.length || 1}
                value={randomCount}
                onChange={setRandomCount}
                placeholder="Random count"
                aria-label="Random draw count"
              />
              <Button
                disabled={!selected.length}
                loading={add.isPending}
                onClick={() =>
                  add.mutate({
                    quizActivityId,
                    questionIds: selected,
                    randomCount: randomCount ?? undefined,
                  })
                }
              >
                {randomCount ? "Draw random subset" : "Add selected to quiz"}
              </Button>
            </>
          )}
        </Space>
      </Card>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        rowSelection={
          quizActivityId
            ? {
                selectedRowKeys: selected,
                onChange: (keys) => setSelected(keys.map(Number)),
              }
            : undefined
        }
        columns={[
          { title: "Question", dataIndex: "prompt" },
          {
            title: "Difficulty",
            dataIndex: "difficulty",
            render: (value: string) => <Tag>{value}</Tag>,
          },
          {
            title: "Tags",
            dataIndex: "tags",
            render: (tags: string[]) =>
              tags.map((tag) => <Tag key={tag}>{tag}</Tag>),
          },
          {
            title: "Item analysis",
            render: (_, row) => (
              <Typography.Text>
                {row.attemptCount} attempts ·{" "}
                {row.correctRate === null
                  ? "No data"
                  : `${row.correctRate}% correct`}
              </Typography.Text>
            ),
          },
          { title: "Uses", dataIndex: "usageCount" },
          {
            title: "",
            render: (_, row) => (
              <Button
                danger
                type="text"
                onClick={() => remove.mutate({ id: row.id })}
              >
                Delete
              </Button>
            ),
          },
        ]}
      />
      <Modal
        title="Create bank question"
        open={open}
        footer={null}
        onCancel={() => setOpen(false)}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ difficulty: "medium", points: 1 }}
          onFinish={submit}
        >
          <Form.Item
            name="prompt"
            label="Question"
            rules={[{ required: true }]}
          >
            <Input.TextArea />
          </Form.Item>
          <Form.Item
            name="answer"
            label="Correct answer"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="difficulty" label="Difficulty">
            <Select
              options={["easy", "medium", "hard"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          <Form.Item name="tags" label="Tags" extra="Comma-separated">
            <Input />
          </Form.Item>
          <Form.Item name="points" label="Points">
            <InputNumber min={1} />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={create.isPending}>
            Save
          </Button>
        </Form>
      </Modal>
    </Space>
  );
}
