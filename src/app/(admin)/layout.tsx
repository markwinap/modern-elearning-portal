import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";

import { AdminLayoutShell } from "./_components/admin-layout-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if ((session.user.role as string | undefined) !== "admin") redirect("/dashboard");

  return (
    <AdminLayoutShell userName={session.user.name} userImage={session.user.image}>
      {children}
    </AdminLayoutShell>
  );
}
