import { api } from "~/trpc/server";

import { GradeReport } from "./_components/grade-report";

export const metadata = {
  title: "My Grades | Modern E-Learning Portal",
};

export default async function GradesPage() {
  const summary = await api.gradebook.getMyGradeSummary();
  return <GradeReport summary={summary} />;
}
