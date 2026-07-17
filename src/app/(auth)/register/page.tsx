import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";

import { RegisterForm } from "./_components/register-form";

export const metadata = { title: "Register — Modern E-Learning Portal" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session?.user) redirect("/dashboard");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--ant-color-bg-layout)",
      }}
    >
      <RegisterForm />
    </div>
  );
}
