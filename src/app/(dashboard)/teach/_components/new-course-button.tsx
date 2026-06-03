"use client";

import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import Link from "next/link";

export function NewCourseButton() {
  return (
    <Link href="/teach/courses/new">
      <Button type="primary" icon={<PlusOutlined />}>
        New Course
      </Button>
    </Link>
  );
}
