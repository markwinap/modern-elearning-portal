"use client";

import { useRouter } from "next/navigation";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

export function NewCourseButton() {
  const router = useRouter();
  return (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => router.push("/teach/courses/new")}
    >
      New Course
    </Button>
  );
}
