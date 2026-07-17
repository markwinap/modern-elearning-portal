"use client";

import {
  FileOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  ToolOutlined,
} from "@ant-design/icons";

interface Props {
  type: string;
}

export function ActivityIcon({ type }: Props) {
  switch (type) {
    case "lesson":
      return <PlayCircleOutlined />;
    case "quiz":
      return <QuestionCircleOutlined />;
    case "file":
      return <FileOutlined />;
    case "url":
      return <LinkOutlined />;
    case "workshop":
      return <ToolOutlined />;
    default:
      return <ReadOutlined />;
  }
}
