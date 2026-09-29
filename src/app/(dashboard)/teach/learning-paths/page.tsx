import { redirect } from "next/navigation";

import { PathBuilder } from "~/components/paths/path-builder";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

export const metadata = { title: "Learning paths" };

export default async function LearningPathsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  const [courses, skills] = await Promise.all([
    api.course.getTeacherCourses({ onlyMine: false }),
    api.skill.list(),
  ]);
  return (
    <main>
      <h1>Learning paths</h1>
      <PathBuilder
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        skills={skills.map((s) => ({ id: s.id, name: s.name }))}
      />
    </main>
  );
}
