"use client";

import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

export function NewCourseButton() {
  return (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      href="/teach/courses/new"
      aria-label="Create a new course"
    >
      New Course
    </Button>
  );
}
