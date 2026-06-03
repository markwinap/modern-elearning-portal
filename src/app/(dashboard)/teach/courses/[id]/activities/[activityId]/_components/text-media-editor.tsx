"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button, Card, Space, Typography, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import "@mdxeditor/editor/style.css";

import { api } from "~/trpc/react";

// Dynamically import to avoid SSR issues — MDXEditor uses browser-only APIs
const MDXEditor = dynamic(
  () =>
    import("@mdxeditor/editor").then(
      ({
        MDXEditor: Editor,
        headingsPlugin,
        listsPlugin,
        quotePlugin,
        thematicBreakPlugin,
        markdownShortcutPlugin,
        linkPlugin,
        linkDialogPlugin,
        toolbarPlugin,
        UndoRedo,
        Separator,
        BoldItalicUnderlineToggles,
        BlockTypeSelect,
        ListsToggle,
        CreateLink,
        InsertThematicBreak,
      }) => {
        function MDXEditorWrapper({
          markdown,
          onChange,
        }: {
          markdown: string;
          onChange: (v: string) => void;
        }) {
          return (
            <Editor
              markdown={markdown}
              onChange={onChange}
              plugins={[
                headingsPlugin(),
                listsPlugin(),
                quotePlugin(),
                thematicBreakPlugin(),
                markdownShortcutPlugin(),
                linkPlugin(),
                linkDialogPlugin(),
                toolbarPlugin({
                  toolbarContents: () => (
                    <>
                      <UndoRedo />
                      <Separator />
                      <BoldItalicUnderlineToggles />
                      <Separator />
                      <BlockTypeSelect />
                      <ListsToggle />
                      <CreateLink />
                      <InsertThematicBreak />
                    </>
                  ),
                }),
              ]}
            />
          );
        }
        return { default: MDXEditorWrapper };
      },
    ),
  { ssr: false },
);

interface Props {
  activityId: number;
  initialContent: string;
}

export function TextMediaEditor({ activityId, initialContent }: Props) {
  const [content, setContent] = useState(initialContent);
  const [messageApi, contextHolder] = message.useMessage();
  const utils = api.useUtils();

  const upsert = api.textMedia.upsert.useMutation({
    onSuccess: () => {
      void utils.textMedia.getByActivity.invalidate({ activityId });
      messageApi.success("Content saved!");
    },
    onError: (err) => messageApi.error(err.message),
  });

  return (
    <>
      {contextHolder}
      <Card
        title={<Typography.Text strong>Text &amp; Media Content</Typography.Text>}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={upsert.isPending}
            onClick={() => upsert.mutate({ activityId, content })}
          >
            Save
          </Button>
        }
      >
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Write content using Markdown. Use the toolbar for formatting, or type syntax directly.
          </Typography.Text>
          <MDXEditor markdown={content} onChange={setContent} />
        </Space>
      </Card>
    </>
  );
}
