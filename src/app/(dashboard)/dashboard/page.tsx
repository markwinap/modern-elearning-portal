import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { DashboardContent } from "./_components/dashboard-content";

export const metadata = { title: "Dashboard — Modern E-Learning Portal" };

export default async function DashboardPage() {
  const [session, stats] = await Promise.all([
    getSession(),
    api.user.getDashboardStats(),
  ]);

  return <DashboardContent userName={session?.user?.name} stats={stats} />;
}
