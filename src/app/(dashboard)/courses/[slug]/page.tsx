import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { CourseDetailClient } from "./_components/course-detail-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await api.course.getBySlug({ slug });
    return { title: `${course.title} | EduCore`, description: course.description ?? undefined };
  } catch {
    return { title: "Course | EduCore" };
  }
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;

  let course;
  try {
    course = await api.course.getBySlug({ slug });
  } catch {
    notFound();
  }

  const enrollment = await api.enrollment.isEnrolled({ courseId: course.id });

  return <CourseDetailClient course={course} enrollment={enrollment} />;
}
