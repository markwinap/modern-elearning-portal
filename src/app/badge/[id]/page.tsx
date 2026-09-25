import Link from "next/link";

import { api } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BadgeVerificationPage({ params }: Props) {
  const { id } = await params;
  const result = await api.certificate.verifyBadge({ uid: id });

  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h1>Digital badge verification</h1>
      {!result.valid && (
        <p role="alert">
          {result.reason === "not_found" && "No badge was found with this ID."}
          {result.reason === "revoked" && "This badge has been revoked."}
          {result.reason === "expired" && "This badge has expired."}
        </p>
      )}
      {result.valid && result.assertion && (
        <>
          <p role="status">This is a valid Open Badges assertion.</p>
          <dl>
            <dt>Badge</dt>
            <dd>{result.assertion.name}</dd>
            <dt>Description</dt>
            <dd>{result.assertion.description}</dd>
            <dt>Issued</dt>
            <dd>{result.assertion.issuedOn.toLocaleDateString()}</dd>
            <dt>Assertion ID</dt>
            <dd>{result.assertion.uid}</dd>
          </dl>
          <p>
            <Link href={`/badge/${result.assertion.uid}/assertion`}>
              View Open Badges 2.0 JSON
            </Link>
          </p>
        </>
      )}
      <Link href="/">Back to home</Link>
    </main>
  );
}
