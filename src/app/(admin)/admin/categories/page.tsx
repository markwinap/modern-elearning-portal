import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { CategoriesManager } from "./_components/categories-manager";

export const metadata: Metadata = { title: "Categories | EduCore Admin" };

export default async function AdminCategoriesPage() {
  const categories = await api.category.list();
  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>Categories</h2>
      <CategoriesManager categories={categories} />
    </div>
  );
}
