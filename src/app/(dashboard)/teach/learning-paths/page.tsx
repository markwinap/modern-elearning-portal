import { api } from "~/trpc/server";

import { PathBuilder } from "~/components/paths/path-builder";

export const metadata = { title: "Learning paths" };

export default async function LearningPathsPage() {
  const [courses, skills] = await Promise.all([
    api.course.list({ page: 1, limit: 100 }),
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
