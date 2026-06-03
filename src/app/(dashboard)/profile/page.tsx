import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { ProfileForm } from "./_components/profile-form";

export const metadata: Metadata = {
  title: "My Profile | EduCore",
};

export default async function ProfilePage() {
  const user = await api.user.getMe();
  return <ProfileForm user={user} />;
}
