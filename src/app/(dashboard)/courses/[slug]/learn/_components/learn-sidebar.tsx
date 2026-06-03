"use client";

import {
  FileOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { Menu, Typography, theme } from "antd";
import { usePathname, useRouter } from "next/navigation";

import { useTheme } from "~/components/theme/theme-context";

interface ActivityItem {
  id: number;
  type: string;
  title: string;
  order: number;
  visible: boolean;
}

interface SectionWithActivities {
  id: number;
  title: string;
  order: number;
  visible: boolean;
  activities: ActivityItem[];
}

interface Props {
  slug: string;
  courseTitle: string;
  sectionsWithActivities: SectionWithActivities[];
}

function activityIcon(type: string) {
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

export function LearnSidebar({ slug, courseTitle, sectionsWithActivities }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useTheme();
  const { token } = theme.useToken();

  const selectedKey =
    sectionsWithActivities
      .flatMap((s) => s.activities)
      .find((a) => pathname.endsWith(`/${a.id}`))
      ?.id.toString() ?? "";

  const items = sectionsWithActivities.map((section) => ({
    key: `section-${section.id}`,
    label: section.title,
    children: section.activities.map((activity) => ({
      key: activity.id.toString(),
      icon: activityIcon(activity.type),
      label: activity.title,
    })),
  }));

  return (
    <div
      style={{
        width: 280,
        minWidth: 280,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        display: "flex",
        flexDirection: "column",
        background: token.colorBgContainer,
        overflowY: "auto",
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorBgLayout,
        }}
      >
        <Typography.Text strong style={{ fontSize: 13, display: "block" }}>
          {courseTitle}
        </Typography.Text>
      </div>
      <Menu
        theme={isDark ? "dark" : "light"}
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={sectionsWithActivities.map((s) => `section-${s.id}`)}
        items={items}
        onClick={({ key }) => {
          // Only navigate for activity items (not section keys)
          if (!key.startsWith("section-")) {
            router.push(`/courses/${slug}/learn/${key}`);
          }
        }}
        style={{ border: "none", flex: 1 }}
      />
    </div>
  );
}
