import { redirect } from "next/navigation";

import { api } from "~/trpc/server";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LearnIndexPage({ params }: Props) {
  const { slug } = await params;

  const course = await api.course.getBySlug({ slug });
  const sections = await api.section.listByCourse({ courseId: course.id });

  for (const section of sections.filter((s) => s.visible)) {
    const activities = await api.activity.listBySection({ sectionId: section.id });
    const first = activities.find((a) => a.visible);
    if (first) {
      redirect(`/courses/${slug}/learn/${first.id}`);
    }
  }

  // No activities found
  redirect(`/courses/${slug}`);
}
