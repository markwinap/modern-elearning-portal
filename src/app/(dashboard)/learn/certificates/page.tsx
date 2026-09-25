import { api } from "~/trpc/server";

import { CertificatePortfolio } from "./_components/certificate-portfolio";

export default async function CertificatesPage() {
  const [certificates, badges] = await Promise.all([
    api.certificate.myCertificates(),
    api.certificate.myBadges(),
  ]);
  return (
    <main>
      <h1>Certificates and badges</h1>
      <CertificatePortfolio certificates={certificates} badges={badges} />
    </main>
  );
}
