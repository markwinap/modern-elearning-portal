import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { TeacherDashboard } from "./_components/teacher-dashboard";
import { NewCourseButton } from "./_components/new-course-button";

export const metadata: Metadata = { title: "My Teaching Courses | EduCore" };

export default async function TeachPage() {
  const courses = await api.course.getMyCourses();
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>My Courses</h2>
        <NewCourseButton />
      </div>
      <TeacherDashboard courses={courses} />
    </div>
  );
}
