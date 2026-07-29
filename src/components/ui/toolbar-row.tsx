"use client";

import type { ReactNode } from "react";

interface Props {
  left?: ReactNode;
  right?: ReactNode;
  marginBottom?: number;
}

export function ToolbarRow({ left, right, marginBottom = 16 }: Props) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
        marginBottom,
      }}
    >
      <div>{left}</div>
      {right ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {right}
        </div>
      ) : null}
    </div>
  );
}
