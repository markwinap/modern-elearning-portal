import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { AdminCoursesTable } from "./_components/admin-courses-table";
import { CreateCourseButton } from "./_components/create-course-button";

export const metadata: Metadata = { title: "All Courses | EduCore Admin" };

export default async function AdminCoursesPage() {
  const courses = await api.course.listAll({ page: 1, limit: 50 });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>All Courses</h2>
        <CreateCourseButton />
      </div>
      <AdminCoursesTable courses={courses} />
    </div>
  );
}
