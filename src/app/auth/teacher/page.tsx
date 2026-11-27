import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import TeacherLoginClient from "@/components/TeacherLoginClient";

export const metadata: Metadata = { title: "دخول المدرس", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function TeacherLoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "teacher" ? "/admin" : user.role === "staff" ? "/team" : "/dashboard");
  return <TeacherLoginClient />;
}
