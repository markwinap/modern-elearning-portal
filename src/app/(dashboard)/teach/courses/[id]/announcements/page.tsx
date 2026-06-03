import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { AnnouncementsPanel } from "./_components/announcements-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnnouncementsPage({ params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();

  const announcements = await api.announcement.listByCourse({ courseId });
  return <AnnouncementsPanel courseId={courseId} initialAnnouncements={announcements} />;
}
