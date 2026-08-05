import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { api } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";

import { TeacherDashboard } from "./_components/teacher-dashboard";
import { NewCourseButton } from "./_components/new-course-button";
import { PageHeader } from "~/components/ui/page-header";

export const metadata: Metadata = {
  title: "All Courses | Modern E-Learning Portal",
};

export default async function TeachPage() {
  const [session, courses] = await Promise.all([
    getSession(),
    api.course.getTeacherCourses({ onlyMine: false }),
  ]);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div>
      <PageHeader title="All Courses" extra={<NewCourseButton />} />
      <TeacherDashboard
        courses={courses}
        currentUserId={session.user.id}
        role={session.user.role as "student" | "teacher" | "admin"}
      />
    </div>
  );
}
