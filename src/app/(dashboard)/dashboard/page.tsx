import { getSession } from "~/server/better-auth/server";

import { DashboardContent } from "./_components/dashboard-content";

export const metadata = { title: "Dashboard — EduCore" };

export default async function DashboardPage() {
  const session = await getSession();
  return <DashboardContent userName={session?.user?.name} />;
}
