import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { AdminSettingsPanel } from "./_components/admin-settings-panel";

export const metadata: Metadata = {
  title: "Admin Settings | Modern E-Learning Portal",
};

export default async function AdminSettingsPage() {
  const settings = await api.settings.get();
  return <AdminSettingsPanel settings={settings} />;
}
