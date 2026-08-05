import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";
import { DiscussionsPanel } from "~/app/(dashboard)/teach/courses/[id]/discussions/_components/discussions-panel";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata = { title: "Discussions — Modern E-Learning Portal" };

export default async function CourseDiscussionsPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const course = await api.course.getBySlug({ slug });
  const session = await getSession();
  const isTeacherOrAdmin =
    course.teacherId === session?.user.id || session?.user.role === "admin";

  if (!isTeacherOrAdmin) {
    const enrollment = await api.enrollment.isEnrolled({ courseId: course.id });
    if (enrollment?.status !== "active") notFound();
  }

  const search = await searchParams;
  const rawThreadId = search?.threadId;
  const threadId =
    typeof rawThreadId === "string" ? parseInt(rawThreadId, 10) : undefined;
  const initialThreadId =
    threadId !== undefined && !isNaN(threadId) ? threadId : undefined;

  return (
    <DiscussionsPanel courseId={course.id} initialThreadId={initialThreadId} />
  );
}
