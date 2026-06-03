import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { AdminStatsGrid } from "./_components/admin-stats-grid";

export const metadata: Metadata = { title: "Admin Dashboard | EduCore" };

export default async function AdminPage() {
  const stats = await api.user.getStats();
  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>Admin Dashboard</h2>
      <AdminStatsGrid stats={stats} />
    </div>
  );
}
