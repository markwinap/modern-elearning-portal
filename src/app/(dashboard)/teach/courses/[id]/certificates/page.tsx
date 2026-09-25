import { notFound } from "next/navigation";

import { CertificateDesigner } from "~/components/certificates/certificate-designer";
import { api } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CourseCertificatesPage({ params }: Props) {
  const { id } = await params;
  const courseId = parseInt(id, 10);
  if (isNaN(courseId)) notFound();
  await api.course.getById({ id: courseId });

  return (
    <main>
      <h1>Certificate configuration</h1>
      <CertificateDesigner courseId={courseId} />
    </main>
  );
}
