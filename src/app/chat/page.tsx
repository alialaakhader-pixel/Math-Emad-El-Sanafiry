import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import ChatClient from "@/components/ChatClient";

export const metadata: Metadata = { title: "شات الصف", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role === "teacher") redirect("/admin/chat");
  if (user.role !== "student") redirect("/team");
  return <div className="app-page"><SiteHeader user={{ name: user.name, role: user.role }}/><main className="app-container"><div className="page-head"><span className="section-kicker"><span/> شات الصف</span><h1>اسأل زمايلك</h1></div><ChatClient/></main></div>;
}
