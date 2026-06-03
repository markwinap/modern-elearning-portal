"use client";

import { useEffect, useState } from "react";

import { Card, Empty } from "antd";

interface Props {
  content: string | null;
}

function sanitizeHtml(dirty: string): string {
  const doc = new DOMParser().parseFromString(dirty, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, form, base").forEach((el) => el.remove());
  for (const el of Array.from(doc.querySelectorAll("*"))) {
    for (const attr of Array.from(el.attributes)) {
      if (
        /^on/i.test(attr.name) ||
        ((attr.name === "href" || attr.name === "src") &&
          /^javascript:/i.test(attr.value.trim())) ||
        attr.name === "srcdoc"
      ) {
        el.removeAttribute(attr.name);
      }
    }
  }
  return doc.body.innerHTML;
}

export function PageViewer({ content }: Props) {
  const [safeHtml, setSafeHtml] = useState<string | null>(null);

  useEffect(() => {
    setSafeHtml(content ? sanitizeHtml(content) : null);
  }, [content]);

  if (!content) {
    return (
      <Card>
        <Empty description="No content yet." />
      </Card>
    );
  }

  return (
    <Card>
      {safeHtml !== null && (
        <div
          className="prose"
          style={{ maxWidth: "none", lineHeight: 1.75, fontSize: 15 }}
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      )}
    </Card>
  );
}
