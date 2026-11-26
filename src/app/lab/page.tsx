import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import LabClient from "@/components/LabClient";

export const metadata: Metadata = { title: "معمل الرياضيات التفاعلي", description: "ارسم الدوال، استخدم السبورة والآلة الحاسبة، واستكشف المجسمات الرياضية في معمل رياضيات تفاعلي." };
export const dynamic = "force-dynamic";
export default async function LabPage() {
  const user = await getCurrentUser();
  return <LabClient user={user ? { name: user.name, role: user.role } : null} assistantAvailable={!!user && !!process.env.OPENAI_API_KEY}/>;
}
