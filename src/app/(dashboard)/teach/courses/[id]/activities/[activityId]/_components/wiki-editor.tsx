"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  List,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  HistoryOutlined,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
  UnlockOutlined,
} from "@ant-design/icons";

import { useTRPC, type RouterOutputs } from "~/trpc/react";
import { MarkdownEditor } from "~/components/ui/markdown-editor";

type WikiPage = RouterOutputs["wiki"]["listPages"][number];

interface Props {
  activityId: number;
}

export function WikiEditor({ activityId }: Props) {
  const trpc = useTRPC();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { data: pages = [] } = useQuery(
    trpc.wiki.listPages.queryOptions({ activityId }),
  );

  const { data: revisions = [] } = useQuery({
    ...trpc.wiki.getRevisions.queryOptions({
      wikiPageId: selectedPage?.id ?? 0,
    }),
    enabled: !!selectedPage && revisionsOpen,
  });

  const upsert = useMutation(
    trpc.wiki.upsertPage.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries({
          queryKey: trpc.wiki.listPages.queryKey({ activityId }),
        });
        if (data) {
          setSelectedPage(data);
        }
        void messageApi.success("Wiki page saved!");
      },
      onError: (err) => {
        void messageApi.error(err.message);
      },
    }),
  );

  const lock = useMutation(
    trpc.wiki.lockPage.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.wiki.listPages.queryKey({ activityId }),
        });
        void messageApi.success("Page locked.");
      },
      onError: (err) => {
        void messageApi.error(err.message);
      },
    }),
  );

  const unlock = useMutation(
    trpc.wiki.unlockPage.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: trpc.wiki.listPages.queryKey({ activityId }),
        });
        void messageApi.success("Page unlocked.");
      },
      onError: (err) => {
        void messageApi.error(err.message);
      },
    }),
  );

  function selectPage(page: WikiPage) {
    setSelectedPage(page);
    setTitle(page.title);
    setContent(page.content);
  }

  function newPage() {
    setSelectedPage(null);
    setTitle("");
    setContent("");
  }

  function handleSave() {
    upsert.mutate({
      id: selectedPage?.id,
      activityId,
      title,
      content,
    });
  }

  return (
    <>
      {contextHolder}
      <Card
        title={<Typography.Text strong>Wiki Pages</Typography.Text>}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={newPage}>
            New page
          </Button>
        }
      >
        <Space direction="vertical" style={{ width: "100%" }} size="large">
          <List
            dataSource={pages}
            locale={{ emptyText: "No wiki pages yet." }}
            renderItem={(page) => (
              <List.Item
                actions={[
                  <Button
                    key="edit"
                    size="small"
                    onClick={() => selectPage(page)}
                  >
                    Edit
                  </Button>,
                ]}
              >
                <Space>
                  <Typography.Text>{page.title}</Typography.Text>
                  {page.lockedBy && <Tag icon={<LockOutlined />}>Locked</Tag>}
                </Space>
              </List.Item>
            )}
          />

          <Card
            title={
              <Typography.Text strong>
                {selectedPage ? `Edit: ${selectedPage.title}` : "New page"}
              </Typography.Text>
            }
            extra={
              <Space>
                {selectedPage && (
                  <>
                    <Button
                      icon={<HistoryOutlined />}
                      onClick={() => setRevisionsOpen(true)}
                    >
                      Revisions
                    </Button>
                    <Button
                      icon={
                        selectedPage.lockedBy ? (
                          <UnlockOutlined />
                        ) : (
                          <LockOutlined />
                        )
                      }
                      onClick={() =>
                        selectedPage.lockedBy
                          ? unlock.mutate({ id: selectedPage.id })
                          : lock.mutate({ id: selectedPage.id })
                      }
                      loading={
                        selectedPage.lockedBy
                          ? unlock.isPending
                          : lock.isPending
                      }
                    >
                      {selectedPage.lockedBy ? "Unlock" : "Lock"}
                    </Button>
                  </>
                )}
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={upsert.isPending}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: "100%" }}>
              <Input
                placeholder="Page title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <MarkdownEditor markdown={content} onChange={setContent} />
            </Space>
          </Card>
        </Space>
      </Card>

      <Drawer
        title="Revision History"
        open={revisionsOpen}
        onClose={() => setRevisionsOpen(false)}
        width={640}
      >
        {revisions.length === 0 ? (
          <Empty description="No revisions yet." />
        ) : (
          <List
            dataSource={revisions}
            renderItem={(rev) => (
              <List.Item>
                <Space direction="vertical" style={{ width: "100%" }}>
                  <Typography.Text type="secondary">
                    Version {rev.version} —{" "}
                    {new Date(rev.createdAt).toLocaleString()}
                  </Typography.Text>
                  <pre
                    style={{
                      background: "#f5f5f5",
                      padding: 12,
                      borderRadius: 6,
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    {rev.content}
                  </pre>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Drawer>
    </>
  );
}
