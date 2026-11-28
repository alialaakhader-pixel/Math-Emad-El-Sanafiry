import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import DashboardClient from "@/components/DashboardClient";

export const metadata: Metadata = { title: "لوحة الطالب", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role === "teacher") redirect("/admin");
  if (user.role === "staff") redirect("/team");
  if (!user.gradeId && (await db.select({ id: grades.id }).from(grades).where(eq(grades.published, true)).limit(1))[0]) redirect("/welcome");
  return <DashboardClient initialUser={{ name: user.name, email: user.email, id: user.id }}/>;
}
