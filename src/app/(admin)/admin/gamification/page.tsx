import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { AdminGamificationPanel } from "./_components/admin-gamification-panel";

export const metadata: Metadata = {
  title: "Gamification Config | Modern E-Learning Portal",
};

export default async function AdminGamificationPage() {
  const config = await api.gamification.getConfig();
  return <AdminGamificationPanel initialConfig={config} />;
}
