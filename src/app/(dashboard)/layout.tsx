import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";

import { DashboardLayoutShell } from "./_components/dashboard-layout-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const role = (session.user.role as "student" | "teacher" | "admin") ?? "student";

  return (
    <DashboardLayoutShell
      role={role}
      userName={session.user.name}
      userImage={session.user.image}
    >
      {children}
    </DashboardLayoutShell>
  );
}
