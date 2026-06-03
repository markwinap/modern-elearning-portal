import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { api } from "~/trpc/server";

import { CourseManageLayout } from "./_components/course-manage-layout";

interface Props {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TeachCourseLayout({ children, params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();

  const course = await api.course.getById({ id: courseId });

  return (
    <CourseManageLayout course={course} courseId={courseId}>
      {children}
    </CourseManageLayout>
  );
}
