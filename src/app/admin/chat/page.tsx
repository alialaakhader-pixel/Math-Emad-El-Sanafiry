import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { pool } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import ChatClient from "@/components/ChatClient";

export const metadata: Metadata = { title: "مراقبة الشات", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role !== "teacher") redirect("/dashboard");
  const { rows } = await pool.query("select id, title from grades order by sort_order");
  return <div className="app-page"><SiteHeader user={{ name: user.name, role: user.role }}/><main className="app-container"><Link href="/admin" className="app-back">← لوحة المدرس</Link><div className="page-head"><span className="section-kicker"><span/> مراقبة</span><h1>شات الطلبة</h1><p>بتشوف كل الرسائل بأسماء الطلاب كاملة، وتقدر تحذف أي رسالة.</p></div><ChatClient teacher grades={rows}/></main></div>;
}
