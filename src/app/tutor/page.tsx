import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import TutorClient from "@/components/TutorClient";

export const metadata: Metadata = { title: "المعلم الذكي | منصة مهندس فارس عماد" };
export const dynamic = "force-dynamic";
export default async function TutorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role === "staff") redirect("/team");
  return <TutorClient user={{ name: user.name, role: user.role }} voiceEnabled={process.env.TUTOR_VOICE === "1"}/>;
}
