import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import WelcomeClient from "@/components/WelcomeClient";

export const metadata: Metadata = { title: "اختيار الصف الدراسي", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role === "teacher") redirect("/admin");
  if (user.role === "staff") redirect("/team");
  if (user.gradeId) redirect("/dashboard");
  const allGrades = await db.select({ id: grades.id, title: grades.title, stage: grades.stage }).from(grades).where(eq(grades.published, true)).orderBy(grades.sortOrder);
  return <WelcomeClient name={user.name.trim().split(/\s+/)[0] || user.name} grades={allGrades}/>;
}
