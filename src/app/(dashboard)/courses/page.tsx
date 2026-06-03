import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { CourseCatalog } from "./_components/course-catalog";

export const metadata: Metadata = {
  title: "Course Catalog | EduCore",
  description: "Browse all available courses",
};

export default async function CoursesPage() {
  const [courses, categories] = await Promise.all([
    api.course.list({ page: 1, limit: 12 }),
    api.category.list(),
  ]);

  return <CourseCatalog initialCourses={courses} categories={categories} />;
}
