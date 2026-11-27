import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import PracticeClient from "@/components/PracticeClient";

export const metadata: Metadata = { title: "تدرّب | منصة مهندس فارس عماد" };
export const dynamic = "force-dynamic";
export default async function PracticePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role === "staff") redirect("/team");
  return <PracticeClient user={{ name: user.name, role: user.role }} />;
}
