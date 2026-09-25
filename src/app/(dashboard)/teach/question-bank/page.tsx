import { QuestionBankBrowser } from "~/components/quiz/question-bank-browser";
import { getSession } from "~/server/better-auth/server";
import { redirect } from "next/navigation";

export default async function QuestionBankPage() {
  const session = await getSession();
  if (session?.user.role !== "teacher" && session?.user.role !== "admin") redirect("/dashboard");
  return <main><h1>Question bank</h1><p>Create, import, tag, analyze, and reuse questions across quizzes.</p><QuestionBankBrowser /></main>;
}
