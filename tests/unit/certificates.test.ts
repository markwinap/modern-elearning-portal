import { describe, expect, it } from "vitest";

import {
  escapeXml,
  renderCertificateSvg,
} from "~/lib/certificate-render";
import {
  buildBadgeAssertionJson,
  generateSerial,
} from "~/server/lib/certificates";

const baseData = {
  title: "Certificate of Completion",
  learnerName: "Ada Lovelace",
  courseTitle: "Intro to Compliance",
  issuer: "Acme Academy",
  signerName: "Dr. Mentor",
  accentColor: "#1677ff",
  serial: "CERT-TEST1234",
  issuedAt: new Date("2026-01-15T00:00:00Z"),
  expiresAt: null,
};

describe("certificate rendering", () => {
  it("renders an SVG containing template fields", () => {
    const svg = renderCertificateSvg(baseData);
    expect(svg).toContain("<svg");
    expect(svg).toContain("Ada Lovelace");
    expect(svg).toContain("Intro to Compliance");
    expect(svg).toContain("CERT-TEST1234");
    expect(svg).toContain("Does not expire");
    expect(svg).toContain("#1677ff");
  });

  it("shows expiry date when present", () => {
    const svg = renderCertificateSvg({
      ...baseData,
      expiresAt: new Date("2027-01-15T00:00:00Z"),
    });
    expect(svg).toContain("Valid until 2027-01-15");
  });

  it("escapes XML special characters", () => {
    const svg = renderCertificateSvg({
      ...baseData,
      learnerName: `<script>alert("x")</script>`,
    });
    expect(svg).not.toContain("<script>");
    expect(escapeXml(`a<b&"c"`)).toBe("a&lt;b&amp;&quot;c&quot;");
  });
});

describe("serials and badge metadata", () => {
  it("generates unique prefixed serials", () => {
    const a = generateSerial("CERT");
    const b = generateSerial("CERT");
    expect(a).toMatch(/^CERT-[0-9A-F]{16}$/);
    expect(a).not.toBe(b);
  });

  it("builds Open Badges 2.0 compliant assertion JSON", () => {
    const json = buildBadgeAssertionJson({
      uid: "BADGE-1",
      name: "Compliance Badge",
      description: "Completed compliance training",
      learnerEmail: "learner@example.com",
      courseTitle: "Compliance 101",
      issuedOn: new Date("2026-01-15T00:00:00Z"),
      expiresAt: new Date("2027-01-15T00:00:00Z"),
      baseUrl: "https://learn.example.com",
    });
    expect(json["@context"]).toBe("https://w3id.org/openbadges/v2");
    expect(json.type).toBe("Assertion");
    expect(json.id).toBe("https://learn.example.com/badge/BADGE-1/assertion");
    expect(json.recipient.hashed).toBe(true);
    expect(json.recipient.identity).toMatch(/^[a-f0-9]{64}$/);
    expect(json.badge.name).toBe("Compliance Badge");
    expect(json.expires).toBe("2027-01-15T00:00:00.000Z");
  });
});
