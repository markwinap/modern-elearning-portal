"use client";

import {
  Card,
  Progress,
  Space,
  Tag,
  Typography,
} from "antd";

interface Skill {
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

interface Props {
  skills: Skill[];
  categories: Category[];
}

export function SkillMatrix({ skills, categories }: Props) {
  const byCategory = new Map<number | null, Skill[]>();
  for (const skill of skills) {
    const list = byCategory.get(skill.categoryId) ?? [];
    list.push(skill);
    byCategory.set(skill.categoryId, list);
  }
  const catName = (id: number | null) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorized";

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      {Array.from(byCategory.entries()).map(([catId, items]) => (
        <Card key={catId ?? "none"} title={catName(catId)} size="small">
          <Space wrap size="middle">
            {items.map((s) => (
              <Card key={s.skillId} size="small" style={{ width: 260 }}>
                <Typography.Text strong>{s.skillName}</Typography.Text>
                {s.description && (
                  <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                    {s.description}
                  </Typography.Paragraph>
                )}
                <Progress percent={s.score ?? 0} size="small" />
                {s.attainedAt ? (
                  <Tag color="green">Attained</Tag>
                ) : (
                  <Tag>In progress</Tag>
                )}
              </Card>
            ))}
          </Space>
        </Card>
      ))}
      {skills.length === 0 && (
        <Typography.Text type="secondary">No skills defined yet.</Typography.Text>
      )}
    </Space>
  );
}
