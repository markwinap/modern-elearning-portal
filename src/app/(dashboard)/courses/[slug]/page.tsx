import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { api } from "~/trpc/server";

import { CourseDetailClient } from "./_components/course-detail-client";

interface Props {
  params: Promise<{ slug: string }>;
}

// Deduplicates the `getBySlug` call within a single request: tRPC server-caller
// invocations are not memoized like `fetch()`, so both `generateMetadata` and
// the page component would otherwise trigger the query twice.
const getCourseBySlug = cache((slug: string) => api.course.getBySlug({ slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await getCourseBySlug(slug);
    return {
      title: `${course.title} | Modern E-Learning Portal`,
      description: course.description ?? undefined,
    };
  } catch {
    return { title: "Course | Modern E-Learning Portal" };
  }
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;

  let course;
  try {
    course = await getCourseBySlug(slug);
  } catch {
    notFound();
  }

  const enrollment = await api.enrollment.isEnrolled({ courseId: course.id });

  return <CourseDetailClient course={course} enrollment={enrollment} />;
}
