import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { liveConfigured } from "@/lib/live";
import LiveClient from "@/components/LiveClient";

export const metadata: Metadata = { title: "الحصص المباشرة | منصة مستر عماد السنافيري" };
export const dynamic = "force-dynamic";
export default async function LivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role === "staff") redirect("/team");
  const all = await db.select({ id: grades.id, title: grades.title }).from(grades).where(eq(grades.published, true)).orderBy(asc(grades.sortOrder));
  const list = user.role === "teacher" ? all : all.filter(g => g.id === user.gradeId);
  return <LiveClient user={{ name: user.name, role: user.role }} grades={list} configured={liveConfigured()}/>;
}
