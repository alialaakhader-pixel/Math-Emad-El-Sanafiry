import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import AdminClient from "@/components/AdminClient";

export const metadata: Metadata = { title: "إدارة المنصة", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role !== "teacher") redirect("/dashboard");
  return <AdminClient teacher={{ name: user.name, email: user.email }}/>;
}
