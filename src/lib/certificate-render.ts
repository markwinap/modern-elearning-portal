export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export interface CertificateData {
  title: string;
  learnerName: string;
  courseTitle: string;
  issuer: string;
  signerName: string | null;
  accentColor: string;
  serial: string;
  issuedAt: Date;
  expiresAt: Date | null;
}

export function renderCertificateSvg(data: CertificateData): string {
  const date = data.issuedAt.toISOString().slice(0, 10);
  const expiry = data.expiresAt
    ? `Valid until ${data.expiresAt.toISOString().slice(0, 10)}`
    : "Does not expire";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="790" viewBox="0 0 1120 790" role="img" aria-label="${escapeXml(data.title)}">
  <rect width="1120" height="790" fill="#ffffff"/>
  <rect x="24" y="24" width="1072" height="742" fill="none" stroke="${escapeXml(data.accentColor)}" stroke-width="6"/>
  <rect x="40" y="40" width="1040" height="710" fill="none" stroke="#d9d9d9" stroke-width="1"/>
  <text x="560" y="150" text-anchor="middle" font-family="Georgia, serif" font-size="48" fill="#1f1f1f">${escapeXml(data.title)}</text>
  <text x="560" y="215" text-anchor="middle" font-family="Arial" font-size="20" fill="#595959">This is to certify that</text>
  <text x="560" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="${escapeXml(data.accentColor)}">${escapeXml(data.learnerName)}</text>
  <text x="560" y="360" text-anchor="middle" font-family="Arial" font-size="20" fill="#595959">has successfully completed</text>
  <text x="560" y="425" text-anchor="middle" font-family="Georgia, serif" font-size="36" fill="#1f1f1f">${escapeXml(data.courseTitle)}</text>
  <text x="560" y="500" text-anchor="middle" font-family="Arial" font-size="16" fill="#595959">Issued ${date} · ${escapeXml(expiry)}</text>
  <line x1="200" y1="640" x2="440" y2="640" stroke="#8c8c8c" stroke-width="1"/>
  <text x="320" y="670" text-anchor="middle" font-family="Arial" font-size="16" fill="#595959">${escapeXml(data.signerName ?? data.issuer)}</text>
  <text x="320" y="692" text-anchor="middle" font-family="Arial" font-size="12" fill="#8c8c8c">${escapeXml(data.issuer)}</text>
  <text x="800" y="660" text-anchor="middle" font-family="monospace" font-size="14" fill="#8c8c8c">Serial: ${escapeXml(data.serial)}</text>
</svg>`;
}
