import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import StudioClient from "@/components/StudioClient";

export const metadata: Metadata = { title: "استوديو الصور | منصة مهندس فارس عماد", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function StudioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  return <StudioClient user={{ name: user.name, role: user.role }} />;
}
