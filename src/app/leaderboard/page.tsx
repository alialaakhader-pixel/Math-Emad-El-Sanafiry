import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import LeaderboardClient from "@/components/LeaderboardClient";

export const metadata: Metadata = { title: "المتصدرين", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role !== "student") redirect(user.role === "teacher" ? "/admin" : "/team");
  return <div className="app-page"><SiteHeader user={{ name: user.name, role: user.role }}/><main className="app-container"><LeaderboardClient/></main></div>;
}
