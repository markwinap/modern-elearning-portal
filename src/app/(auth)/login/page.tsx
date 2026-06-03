import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";

import { LoginForm } from "./_components/login-form";

export const metadata = { title: "Sign In — EduCore" };

export default async function LoginPage() {
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
      <LoginForm />
    </div>
  );
}
