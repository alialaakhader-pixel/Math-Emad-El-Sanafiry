import type { Metadata } from "next";
import SolveClient from "@/components/SolveClient";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "حلّال المسائل | منصة مهندس فارس عماد", description: "اكتب أي مسألة أو صوّرها واحصل على حل خطوة بخطوة.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function SolvePage() {
  const user = await getCurrentUser();
  return <SolveClient user={user ? { name: user.name, role: user.role } : undefined} />;
}
