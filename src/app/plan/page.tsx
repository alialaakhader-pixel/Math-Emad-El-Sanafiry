import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import PlanClient from "@/components/PlanClient";

export const metadata: Metadata = { title: "خطة المذاكرة | منصة مهندس فارس عماد" };
export const dynamic = "force-dynamic";
export default async function PlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role !== "student") redirect("/");
  return <PlanClient user={{ name: user.name, role: user.role }} />;
}
