import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import AuthClient from "@/components/AuthClient";

export const metadata: Metadata = { title: "الدخول وإنشاء حساب" };
export const dynamic = "force-dynamic";
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string; token?: string; error?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user && params.mode !== "reset") redirect(user.role === "teacher" ? "/admin" : "/dashboard");
  const allGrades = await db.select({ id: grades.id, title: grades.title }).from(grades).where(eq(grades.published, true)).orderBy(grades.sortOrder);
  return <AuthClient grades={allGrades} googleAvailable={!!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} mode={params.mode || "register"} token={params.token || ""} error={params.error || ""}/>;
}
