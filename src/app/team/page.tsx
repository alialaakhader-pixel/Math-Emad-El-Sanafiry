import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import TeamClient from "@/components/TeamClient";

export const metadata: Metadata = { title: "لوحة الفريق", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role !== "teacher" && user.role !== "staff") redirect("/dashboard");
  return <TeamClient user={{ name: user.name, role: user.role }}/>;
}
