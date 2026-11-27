import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import ForumClient from "@/components/ForumClient";

export const metadata: Metadata = { title: "المنتدى | منصة مهندس فارس عماد" };
export const dynamic = "force-dynamic";
export default async function ForumPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  return <ForumClient user={{ name: user.name, role: user.role }}/>;
}
