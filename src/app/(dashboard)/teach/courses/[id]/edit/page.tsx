import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { EditCourseForm } from "./_components/edit-course-form";

export const metadata: Metadata = {
  title: "Edit Course | Modern E-Learning Portal",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCoursePage({ params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();

  const [course, categories, teachers] = await Promise.all([
    api.course.getById({ id: courseId }),
    api.category.list(),
    api.user.listTeachers(),
  ]);

  return (
    <EditCourseForm
      course={course}
      categories={categories}
      teachers={teachers}
    />
  );
}
