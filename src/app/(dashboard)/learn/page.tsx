import { redirect } from "next/navigation";

export const metadata = { title: "My Learning — Modern E-Learning Portal" };

export default function LearnPage() {
  redirect("/dashboard");
}
