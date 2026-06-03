import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { StudentsTable } from "./_components/students-table";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function StudentsPage({ params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();

  const students = await api.enrollment.getStudents({ courseId });
  return <StudentsTable students={students} />;
}
