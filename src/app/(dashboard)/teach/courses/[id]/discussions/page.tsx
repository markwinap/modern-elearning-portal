import { notFound } from "next/navigation";

import { DiscussionsPanel } from "./_components/discussions-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DiscussionsPage({ params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();

  return <DiscussionsPanel courseId={courseId} />;
}
