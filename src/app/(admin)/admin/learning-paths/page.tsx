import type { Metadata } from "next";

import { PathBuilder } from "~/components/paths/path-builder";
import { api } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Learning Paths | Modern E-Learning Portal Admin",
};

export default async function AdminLearningPathsPage() {
  const [courses, skills] = await Promise.all([
    api.course.getTeacherCourses({ onlyMine: false }),
    api.skill.list(),
  ]);

  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>
        Learning Paths
      </h2>
      <PathBuilder
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        skills={skills.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
