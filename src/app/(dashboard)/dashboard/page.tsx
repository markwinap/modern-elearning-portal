import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import { LearnerHome } from "~/components/dashboard/LearnerHome";

import { DashboardContent } from "./_components/dashboard-content";

export const metadata = { title: "Dashboard — Modern E-Learning Portal" };

export default async function DashboardPage() {
  const session = await getSession();
  const role = session?.user?.role ?? "student";
  const userName = session?.user?.name ?? "Learner";

  if (role === "student") {
    const learnerHome = await api.dashboard.getLearnerHome();

    return (
      <LearnerHome
        userName={userName}
        continueLearning={learnerHome.continueLearning}
        upcomingDeadlines={learnerHome.upcomingDeadlines}
        announcements={learnerHome.announcements}
        recommendations={learnerHome.recommendations}
      />
    );
  }

  const [stats, courses, recent] = await Promise.all([
    api.user.getDashboardStats(),
    api.course.getMyCoursesSummary(),
    api.progress.getMyRecentActivity({ limit: 5 }),
  ]);

  return (
    <DashboardContent
      userName={userName}
      stats={stats}
      courses={courses}
      recent={recent}
    />
  );
}
