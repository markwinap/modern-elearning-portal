"use client";

import { SkillMatrix } from "~/components/skills/skill-matrix";

interface SkillRow {
  skillId: number;
  skillName: string;
  description: string | null;
  categoryId: number | null;
  score: number | null;
  attainedAt: Date | null;
}

interface Category {
  id: number;
  name: string;
}

export function SkillMatrixWrapper({
  skills,
  categories,
}: {
  skills: SkillRow[];
  categories: Category[];
}) {
  return <SkillMatrix skills={skills} categories={categories} />;
}
