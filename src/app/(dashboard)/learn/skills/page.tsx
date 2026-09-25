import { api } from "~/trpc/server";

import { SkillMatrixWrapper } from "./_components/skill-matrix-wrapper";

export const metadata = { title: "My skills" };

export default async function MySkillsPage() {
  const profile = await api.skill.getMySkillProfile();
  return (
    <main>
      <h1>My skills</h1>
      <SkillMatrixWrapper
        skills={profile.skills}
        categories={profile.categories}
      />
    </main>
  );
}
