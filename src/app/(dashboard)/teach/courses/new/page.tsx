import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { CreateCourseForm } from "./_components/create-course-form";

export const metadata: Metadata = { title: "Create Course | EduCore" };

export default async function NewCoursePage() {
  const categories = await api.category.list();
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>Create New Course</h2>
      <CreateCourseForm categories={categories} />
    </div>
  );
}
