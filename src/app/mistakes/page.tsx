import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import MistakesClient from "@/components/MistakesClient";

export const metadata: Metadata = { title: "راجع أخطائي | منصة مهندس فارس عماد" };
export const dynamic = "force-dynamic";
export default async function MistakesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role !== "student") redirect("/");
  return <MistakesClient user={{ name: user.name, role: user.role }}/>;
}
