"use client";

import dynamic from "next/dynamic";
import { Card, Empty } from "antd";

// MDEditor.Markdown is the read-only preview bundled with @uiw/react-md-editor
const MarkdownPreview = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => ({ default: mod.default.Markdown })),
  { ssr: false },
);

interface Props {
  content: string | null;
}

export function TextMediaViewer({ content }: Props) {
  if (!content) {
    return (
      <Card>
        <Empty description="No content yet." />
      </Card>
    );
  }

  return (
    <Card>
      <div data-color-mode="light">
        <MarkdownPreview
          source={content}
          style={{ padding: "8px 0", fontSize: 15, lineHeight: 1.75 }}
        />
      </div>
    </Card>
  );
}
