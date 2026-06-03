import type { Metadata } from "next";

import { api } from "~/trpc/server";

import { UsersTable } from "./_components/users-table";

export const metadata: Metadata = { title: "User Management | EduCore Admin" };

export default async function AdminUsersPage() {
  const users = await api.user.listUsers({ page: 1, limit: 50 });
  return (
    <div>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>User Management</h2>
      <UsersTable users={users} />
    </div>
  );
}
