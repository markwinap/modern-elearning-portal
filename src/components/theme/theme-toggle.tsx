"use client";

import { BulbFilled, DesktopOutlined, SunOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";

import { useTheme, type ThemePreference } from "./theme-context";

const icons: Record<ThemePreference, React.ReactNode> = {
  system: <DesktopOutlined />,
  light: <SunOutlined />,
  dark: <BulbFilled />,
};

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  const items: MenuProps["items"] = [
    {
      key: "system",
      icon: <DesktopOutlined />,
      label: "System",
      onClick: () => setPreference("system"),
    },
    {
      key: "light",
      icon: <SunOutlined />,
      label: "Light",
      onClick: () => setPreference("light"),
    },
    {
      key: "dark",
      icon: <BulbFilled />,
      label: "Dark",
      onClick: () => setPreference("dark"),
    },
  ];

  return (
    <Dropdown
      menu={{ items, selectedKeys: [preference] }}
      placement="bottomRight"
      trigger={["click"]}
    >
      <Button type="text" icon={icons[preference]} />
    </Dropdown>
  );
}
