import { redirect } from "next/navigation";

import { api } from "~/trpc/server";
import { getSession } from "~/server/better-auth/server";

import { LearnSidebar } from "./_components/learn-sidebar";

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function LearnLayout({ children, params }: Props) {
  const { slug } = await params;

  const session = await getSession();
  const role = session?.user?.role ?? "student";

  const course = await api.course.getBySlug({ slug });

  // Check enrollment (non-teachers/admins must be enrolled)
  if (role !== "teacher" && role !== "admin") {
    const enrollment = await api.enrollment.isEnrolled({ courseId: course.id });
    if (enrollment?.status !== "active") {
      redirect(`/courses/${slug}`);
    }
  }

  // Fetch all sections and their activities in parallel
  const sections = await api.section.listByCourse({ courseId: course.id });
  const sectionsWithActivities = await Promise.all(
    sections
      .filter((s) => s.visible)
      .map(async (s) => ({
        ...s,
        activities: (await api.activity.listBySection({ sectionId: s.id })).filter(
          (a) => a.visible,
        ),
      })),
  );

  return (
    <div
      style={{
        display: "flex",
        margin: "-24px",
        minHeight: "calc(100vh - 56px)",
        overflow: "hidden",
      }}
    >
      <LearnSidebar
        slug={slug}
        courseTitle={course.title}
        sectionsWithActivities={sectionsWithActivities}
      />
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>{children}</div>
    </div>
  );
}
