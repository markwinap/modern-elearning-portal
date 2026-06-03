import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { MyCourseList } from "./_components/my-course-list";

export const metadata: Metadata = {
  title: "My Courses | EduCore",
  description: "Courses you are enrolled in",
};

export default async function MyCoursesPage() {
  const enrollments = await api.enrollment.getMyEnrollments();
  return <MyCourseList enrollments={enrollments} />;
}
