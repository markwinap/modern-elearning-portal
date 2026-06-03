"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import Link from "next/link";

export function CreateCourseButton() {
  return (
    <Link href="/teach/courses/new">
      <Button type="primary" icon={<PlusOutlined />}>Create Course</Button>
    </Link>
  );
}
