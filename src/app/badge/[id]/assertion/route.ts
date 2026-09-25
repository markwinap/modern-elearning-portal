import { NextResponse } from "next/server";

import { api } from "~/trpc/server";

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  try {
    const json = await api.certificate.badgeJson({
      uid: id,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    });
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Badge not found" }, { status: 404 });
  }
}
