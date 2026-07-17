import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { AdminStatsGrid } from "./_components/admin-stats-grid";
import { PageHeader } from "~/components/ui/page-header";

export const metadata: Metadata = {
  title: "Admin Dashboard | Modern E-Learning Portal",
};

export default async function AdminPage() {
  const stats = await api.user.getStats();
  return (
    <div>
      <PageHeader title="Admin Dashboard" />
      <AdminStatsGrid stats={stats} />
    </div>
  );
}
