"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Flame } from "lucide-react";

type S = { id: string; name: string; grade: string | null; xp: number; streak: number; done: number; total: number; examAvg: number | null; acc: number | null; answers: number; last: string | null };
const days = (iso: string | null) => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;
const lastText = (iso: string | null) => { const d = days(iso); return d === null ? "لسه ماشتغلش" : d <= 0 ? "النهارده" : d === 1 ? "إمبارح" : `من ${d} يوم`; };

export default function StudentsOverview({ items }: { items: S[] }) {
  const [q, setQ] = useState(""); const [grade, setGrade] = useState(""); const [sort, setSort] = useState("recent");
  const grades = useMemo(() => [...new Set(items.map(i => i.grade).filter(Boolean))] as string[], [items]);
  const active7 = items.filter(i => (days(i.last) ?? 99) < 7).length;
  const quiet = items.filter(i => (days(i.last) ?? 99) >= 7).length;
  const list = items.filter(i => (!grade || i.grade === grade) && i.name.includes(q.trim())).sort((a, b) => sort === "xp" ? b.xp - a.xp : sort === "quiet" ? (days(b.last) ?? 999) - (days(a.last) ?? 999) : (days(a.last) ?? 999) - (days(b.last) ?? 999));
  return <>
    <div className="admin-stats"><div className="admin-stat"><small>كل الطلاب</small><strong>{items.length}</strong></div><div className="admin-stat"><small>نشطين آخر 7 أيام</small><strong>{active7}</strong></div><div className="admin-stat"><small>متوقفين 7 أيام+</small><strong>{quiet}</strong></div></div>
    <div className="form-actions" style={{ margin: "16px 0" }}>
      <input className="input" style={{ flex: "1 1 160px" }} placeholder="دوّر باسم الطالب" value={q} onChange={e => setQ(e.target.value)}/>
      <select className="input" style={{ flex: "1 1 120px" }} value={grade} onChange={e => setGrade(e.target.value)}><option value="">كل الصفوف</option>{grades.map(g => <option key={g}>{g}</option>)}</select>
      <select className="input" style={{ flex: "1 1 120px" }} value={sort} onChange={e => setSort(e.target.value)}><option value="recent">الأحدث نشاطا</option><option value="xp">الأعلى نقاط</option><option value="quiet">الأقدم نشاطا (متابعة)</option></select>
    </div>
    {!list.length && <div className="empty-state compact"><h3>مفيش طلاب مطابقين</h3></div>}
    {list.map(i => { const d = days(i.last); return <Link key={i.id} href={`/admin/students/${i.id}`} className="stu-card">
      <div className="stu-top"><strong>{i.name}</strong><span className="tag">{i.grade || "من غير صف"}</span></div>
      <small className="muted">آخر نشاط: {lastText(i.last)}{d !== null && d >= 7 ? " ⚠" : ""}{i.streak > 0 && <> · <Flame size={11} style={{ display: "inline" }}/> {i.streak} يوم</>}</small>
      <div className="stu-grid"><div><b>{i.xp}</b><span>نقطة</span></div><div><b>{i.done}/{i.total}</b><span>محاضرات</span></div><div><b>{i.examAvg === null ? "-" : i.examAvg + "%"}</b><span>متوسط الامتحانات</span></div></div>
    </Link>; })}
  </>;
}
