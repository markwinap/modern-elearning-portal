import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";

export const metadata: Metadata = {
  title: "Settings | Modern E-Learning Portal",
};

export default async function SettingsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  redirect("/profile");
}
