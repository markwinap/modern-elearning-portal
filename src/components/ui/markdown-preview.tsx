"use client";

import dynamic from "next/dynamic";

// MDEditor.Markdown is the read-only preview bundled with @uiw/react-md-editor
const MDPreview = dynamic(
  () =>
    import("@uiw/react-md-editor").then((mod) => ({
      default: mod.default.Markdown,
    })),
  { ssr: false },
);

interface Props {
  source: string;
}

export function MarkdownPreview({ source }: Props) {
  return (
    <div data-color-mode="light">
      <MDPreview
        source={source}
        style={{ padding: "8px 0", fontSize: 15, lineHeight: 1.75 }}
      />
    </div>
  );
}
