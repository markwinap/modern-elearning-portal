"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";

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
  markdown: string;
  onChange: (v: string) => void;
}

export function MarkdownEditor({ markdown, onChange }: Props) {
  // Memoize the component to avoid re-mounting on every parent render
  const Editor = useMemo(
    () => <MDXEditor markdown={markdown} onChange={onChange} />,
    [markdown, onChange],
  );
  return Editor;
}
