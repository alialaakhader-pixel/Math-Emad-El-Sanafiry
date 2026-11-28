"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

type D = { topics: { topic: string; n: number; pct: number }[]; plan: string | null; reason?: string };
export default function PlanClient({ user }: { user: { name: string; role: string } }) {
  const [d, setD] = useState<D | null>(null); const [err, setErr] = useState("");
  useEffect(() => { fetch("/api/ai/plan", { cache: "no-store" }).then(r => r.ok ? r.json() : Promise.reject()).then(setD).catch(() => setErr("مقدرتش أجيب الخطة. جرّب تاني.")); }, []);
  const lines = d?.plan ? d.plan.split("\n").map(l => l.trim()).filter(Boolean) : [];
  return <div className="app-page"><SiteHeader user={user as never}/><main className="app-container pr-page">
    <div className="dashboard-section-head"><h1 style={{ fontSize: 22, margin: 0 }}><CalendarCheck size={20} style={{ verticalAlign: "-3px" }}/> خطة المذاكرة</h1><span className="tag purple">بالذكاء الاصطناعي</span></div>
    {!d && !err && <section className="panel"><p className="small">بحلل نقاط ضعفك وبجهز خطتك... ممكن تاخد 20 ثانية.</p></section>}
    {err && <section className="panel"><p className="small">{err}</p></section>}
    {d && <>
      {d.topics.length > 0 && <section className="panel"><h2>مستواك في المواضيع</h2>{d.topics.map(t => <div className="pr-topic" key={t.topic}><span>{t.topic}</span><div className="pr-bar thin"><i className={t.pct >= 70 ? "ok" : t.pct >= 45 ? "mid" : "low"} style={{ width: t.pct + "%" }}/></div><small dir="ltr">{t.pct}%</small></div>)}</section>}
      {d.plan ? <section className="panel"><h2>خطتك لـ 5 أيام</h2>{lines.map((l, i) => <p key={i} className="small" style={{ lineHeight: 1.9, margin: "8px 0" }}>{l}</p>)}<div className="form-actions"><Link className="btn btn-primary" href="/mistakes">راجع أخطائي</Link><Link className="btn btn-outline" href="/practice">تدرّب</Link></div></section> : <section className="panel"><p className="small">{d.reason}</p><Link className="btn btn-primary" href="/practice">ابدأ تدريب</Link></section>}
    </>}
  </main></div>;
}
