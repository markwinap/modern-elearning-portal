import { notFound } from "next/navigation";

import { GradebookView } from "./_components/gradebook-view";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GradebookPage({ params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();

  return <GradebookView courseId={courseId} />;
}
