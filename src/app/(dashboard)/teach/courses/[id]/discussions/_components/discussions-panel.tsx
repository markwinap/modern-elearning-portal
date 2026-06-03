"use client";

import { useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Space,
  Typography,
  message,
} from "antd";
import { MessageOutlined, PlusOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";

import { api } from "~/trpc/react";

interface Props {
  courseId: number;
}

interface Thread {
  id: number;
  subject: string;
  createdAt: Date;
}

interface Message {
  id: number;
  authorId: string;
  content: string;
  sentAt: Date;
}

export function DiscussionsPanel({ courseId }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [threadForm] = Form.useForm<{ subject: string }>();
  const [replyText, setReplyText] = useState("");
  const utils = api.useUtils();

  const { data: threads = [] } = api.message.listByCourse.useQuery({ courseId });

  const { data: threadMessages = [] } = api.message.getMessages.useQuery(
    { threadId: activeThread?.id ?? 0 },
    { enabled: !!activeThread },
  );

  const createThread = api.message.createThread.useMutation({
    onSuccess: (thread) => {
      void utils.message.listByCourse.invalidate({ courseId });
      setNewThreadOpen(false);
      threadForm.resetFields();
      setActiveThread(thread ?? null);
      messageApi.success("Thread created!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  const sendMessage = api.message.sendMessage.useMutation({
    onSuccess: () => {
      void utils.message.getMessages.invalidate({ threadId: activeThread?.id });
      setReplyText("");
    },
    onError: (err) => messageApi.error(err.message),
  });

  return (
    <>
      {contextHolder}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, minHeight: 400 }}>
        {/* Thread list */}
        <Card
          title="Threads"
          size="small"
          extra={
            <Button size="small" icon={<PlusOutlined />} onClick={() => setNewThreadOpen(true)}>
              New
            </Button>
          }
          styles={{ body: { padding: 0 } }}
        >
          {threads.length === 0 ? (
            <div style={{ padding: 16, color: "#bfbfbf", textAlign: "center" }}>
              <MessageOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <div>No threads yet</div>
            </div>
          ) : (
            <List
              dataSource={threads}
              renderItem={(thread: Thread) => (
                <List.Item
                  onClick={() => setActiveThread(thread)}
                  style={{
                    padding: "8px 16px",
                    cursor: "pointer",
                    background: activeThread?.id === thread.id ? "#f0f5ff" : undefined,
                    borderLeft: activeThread?.id === thread.id ? "3px solid #4F46E5" : "3px solid transparent",
                  }}
                >
                  <div>
                    <Typography.Text strong>{thread.subject}</Typography.Text>
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(thread.createdAt).toLocaleDateString()}
                    </Typography.Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Message view */}
        <Card
          title={activeThread ? activeThread.subject : "Select a thread"}
          size="small"
          styles={{ body: { display: "flex", flexDirection: "column", height: 400 } }}
        >
          {!activeThread ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#bfbfbf" }}>
              Select a thread to view messages
            </div>
          ) : (
            <>
              <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
                {threadMessages.length === 0 ? (
                  <Typography.Text type="secondary">No messages yet. Start the conversation!</Typography.Text>
                ) : (
                  <Space orientation="vertical" style={{ width: "100%" }}>
                    {threadMessages.map((msg: Message) => (
                      <div key={msg.id} style={{ display: "flex", gap: 8 }}>
                        <Avatar size="small" icon={<UserOutlined />} />
                        <div style={{ flex: 1, background: "#f5f5f5", borderRadius: 8, padding: "6px 10px" }}>
                          <Typography.Text style={{ fontSize: 12 }}>{msg.content}</Typography.Text>
                          <div>
                            <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                              {new Date(msg.sentAt).toLocaleTimeString()}
                            </Typography.Text>
                          </div>
                        </div>
                      </div>
                    ))}
                  </Space>
                )}
              </div>
              <Divider style={{ margin: "0 0 8px" }} />
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  placeholder="Type a message…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onPressEnter={() => {
                    if (replyText.trim() && activeThread) {
                      sendMessage.mutate({ threadId: activeThread.id, content: replyText.trim() });
                    }
                  }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sendMessage.isPending}
                  onClick={() => {
                    if (replyText.trim() && activeThread) {
                      sendMessage.mutate({ threadId: activeThread.id, content: replyText.trim() });
                    }
                  }}
                />
              </Space.Compact>
            </>
          )}
        </Card>
      </div>

      <Modal
        title="New Thread"
        open={newThreadOpen}
        onCancel={() => { setNewThreadOpen(false); threadForm.resetFields(); }}
        onOk={() => threadForm.submit()}
        confirmLoading={createThread.isPending}
      >
        <Form
          form={threadForm}
          layout="vertical"
          onFinish={(v) => createThread.mutate({ courseId, subject: v.subject })}
        >
          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
