import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { TeacherDashboard } from "./_components/teacher-dashboard";
import { NewCourseButton } from "./_components/new-course-button";
import { PageHeader } from "~/components/ui/page-header";

export const metadata: Metadata = {
  title: "My Teaching Courses | EduModern E-Learning PortalCore",
};

export default async function TeachPage() {
  const courses = await api.course.getMyCourses();
  return (
    <div>
      <PageHeader title="My Courses" extra={<NewCourseButton />} />
      <TeacherDashboard courses={courses} />
    </div>
  );
}
