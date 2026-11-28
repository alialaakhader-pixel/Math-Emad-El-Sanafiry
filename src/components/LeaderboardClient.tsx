"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, Trophy } from "lucide-react";

type Row = { rank: number; name: string; xp: number; level: number; streak: number; me: boolean };
type D = { needGrade?: boolean; grade?: string; total?: number; top?: Row[]; me?: Row | null; gapToNext?: number | null; error?: string };

export default function LeaderboardClient() {
  const [d, setD] = useState<D | null>(null);
  useEffect(() => { fetch("/api/leaderboard", { cache: "no-store" }).then(r => r.json()).then(setD).catch(() => setD({ error: "مقدرتش أحمّل الترتيب." })); }, []);
  if (!d) return <div className="loading-block"><div className="loading-spinner"/> جارٍ التحميل...</div>;
  if (d.error) return <div className="message error">{d.error}</div>;
  if (d.needGrade) return <div className="panel empty-state"><Trophy size={30}/><h3>اختار صفك الأول</h3><p>الترتيب بيتحسب جوه صفك الدراسي.</p><Link className="btn btn-primary" href="/welcome">اختار صفك</Link></div>;
  const top = d.top || [];
  const meInTop = top.some(r => r.me);
  return <>
    <div className="page-head"><span className="section-kicker"><span/> {d.grade}</span><h1>المتصدرين</h1><p>الترتيب بنقاط التدريب (XP) بين طلاب صفك. بنعرض الاسم الأول بس.</p></div>
    {d.me ? <div className="lb-me"><Trophy size={30}/><div><div className="lb-big">#{d.me.rank} <span style={{ fontSize: 14, fontWeight: 600 }}>من {d.total}</span></div><small>{d.me.xp} نقطة · مستوى {d.me.level}{d.me.streak > 0 ? ` · ${d.me.streak} يوم متواصل` : ""}{d.gapToNext ? ` · فاضل ${d.gapToNext} نقطة وتعدّي اللي قدامك` : ""}</small></div></div>
      : <div className="lb-me"><Trophy size={30}/><div><strong>لسه مش في الترتيب</strong><small>جاوب أي سؤال في التدريب وهتظهر هنا.</small></div></div>}
    <section className="panel">
      <h2>أفضل 10 في صفك</h2>
      {!top.length ? <div className="empty-state compact"><h3>مفيش حد في الترتيب لسه</h3><p>ابدأ تدريب وكون أول واحد.</p><Link className="btn btn-primary" href="/practice">تدرّب دلوقتي</Link></div>
        : top.map(r => <div key={r.rank} className={`lb-row ${r.me ? "me" : ""}`}><span className={`lb-rank ${r.rank <= 3 ? `r${r.rank}` : ""}`}>{r.rank}</span><span className="lb-name">{r.name}{r.me ? " (إنت)" : ""}<small>مستوى {r.level}</small></span>{r.streak > 0 && <span className="tag warn"><Flame size={12}/> {r.streak}</span>}<span className="lb-xp">{r.xp} <small>نقطة</small></span></div>)}
      {d.me && !meInTop && <><div className="split-line"/><div className="lb-row me"><span className="lb-rank">{d.me.rank}</span><span className="lb-name">{d.me.name} (إنت)<small>مستوى {d.me.level}</small></span><span className="lb-xp">{d.me.xp} <small>نقطة</small></span></div></>}
    </section>
    <div style={{ marginTop: 18 }}><Link className="btn btn-primary" href="/practice">كمّل تدريب وطلّع ترتيبك</Link></div>
  </>;
}
