import { redirect } from "next/navigation";

import { HomeHero } from "~/app/_components/home-hero";
import { getSession } from "~/server/better-auth/server";

export default async function HomePage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return <HomeHero />;
}
