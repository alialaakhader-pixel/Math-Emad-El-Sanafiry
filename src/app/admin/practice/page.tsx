import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import PracticeAdminClient from "@/components/PracticeAdminClient";

export const metadata: Metadata = { title: "بنك أسئلة التدريب", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function PracticeAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role !== "teacher") redirect("/dashboard");
  return <PracticeAdminClient teacher={{ name: user.name }} />;
}
