import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";

import { RegisterForm } from "./_components/register-form";

export const metadata = { title: "Register — EduCore" };

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
        background: "#f9fafb",
      }}
    >
      <RegisterForm />
    </div>
  );
}
