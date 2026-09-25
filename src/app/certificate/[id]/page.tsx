import Link from "next/link";

import { api } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CertificateVerificationPage({ params }: Props) {
  const { id } = await params;
  const result = await api.certificate.verify({ serial: id });

  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Certificate verification</h1>
      {!result.valid && (
        <p role="alert">
          {result.reason === "not_found" &&
            "No certificate was found with this serial number."}
          {result.reason === "revoked" &&
            "This certificate has been revoked by the issuer."}
          {result.reason === "expired" &&
            "This certificate has expired."}
        </p>
      )}
      {result.valid && result.certificate && (
        <>
          <p role="status">This certificate is valid.</p>
          <dl>
            <dt>Learner</dt>
            <dd>{result.certificate.learnerName}</dd>
            <dt>Course</dt>
            <dd>{result.certificate.courseTitle}</dd>
            <dt>Issued</dt>
            <dd>{result.certificate.issuedAt.toLocaleDateString()}</dd>
            <dt>Serial</dt>
            <dd>{result.certificate.serial}</dd>
            {result.certificate.expiresAt && (
              <>
                <dt>Expires</dt>
                <dd>{result.certificate.expiresAt.toLocaleDateString()}</dd>
              </>
            )}
          </dl>
        </>
      )}
      <Link href="/">Back to home</Link>
    </main>
  );
}
