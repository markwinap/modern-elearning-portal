import { notFound } from "next/navigation";

import { SectionBuilder } from "./_components/section-builder";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SectionsPage({ params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();

  return <SectionBuilder courseId={courseId} />;
}
