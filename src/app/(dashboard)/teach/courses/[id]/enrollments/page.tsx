import { notFound } from "next/navigation";

import { EnrollmentRequestList } from "./_components/enrollment-request-list";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EnrollmentsPage({ params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();

  return <EnrollmentRequestList courseId={courseId} />;
}
