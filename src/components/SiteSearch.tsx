"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

const PAGES = [
  { href: "/solve", label: "حلّال المسائل", k: "حل مسألة معادلة تكامل تفاضل solve" },
  { href: "/practice", label: "تدرّب", k: "تمارين اسئلة بنك practice" },
  { href: "/exams", label: "الامتحانات", k: "امتحان اختبار exam" },
  { href: "/mistakes", label: "دفتر أخطائي", k: "اخطاء غلطات مراجعة" },
  { href: "/plan", label: "خطة المذاكرة", k: "جدول خطة مذاكرة plan" },
  { href: "/leaderboard", label: "المتصدرين", k: "ترتيب نقاط اوائل" },
  { href: "/forum", label: "المنتدى", k: "سؤال نقاش forum" },
  { href: "/chat", label: "شات الصف", k: "دردشة زمايل chat" },
  { href: "/live", label: "حصص لايف", k: "بث مباشر live" },
  { href: "/lab", label: "معمل الرياضيات", k: "رسم دوال هندسة lab graph" },
  { href: "/tutor", label: "المعلم الذكي", k: "شرح مدرس ذكي ai" },
  { href: "/studio", label: "استوديو الصور", k: "صورة رسم image" },
  { href: "/dashboard", label: "لوحتي", k: "حسابي تقدم dashboard" },
];

export default function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [lec, setLec] = useState<{ id: string; title: string; free: boolean }[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) setTimeout(() => ref.current?.focus(), 30); else { setQ(""); setLec([]); } }, [open]);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) { setLec([]); return; }
    const id = setTimeout(() => { fetch(`/api/search?q=${encodeURIComponent(t)}`).then(r => r.json()).then(d => setLec(d.lectures || [])).catch(() => {}); }, 250);
    return () => clearTimeout(id);
  }, [q]);
  const t = q.trim().toLowerCase();
  const pages = t ? PAGES.filter(p => (p.label + " " + p.k).toLowerCase().includes(t)) : PAGES.slice(0, 6);
  return <>
    <button type="button" className="icon-button" onClick={() => setOpen(true)} aria-label="ابحث في الموقع" title="ابحث في الموقع"><Search size={18}/></button>
    {open && <div className="ssearch-back" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="بحث">
      <div className="ssearch" onClick={e => e.stopPropagation()}>
        <div className="ssearch-row"><Search size={18}/><input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن محاضرة أو صفحة…" aria-label="ابحث" onKeyDown={e => e.key === "Escape" && setOpen(false)}/><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={18}/></button></div>
        <div className="ssearch-list">
          {lec.length > 0 && <><small>محاضرات</small>{lec.map(l => <Link key={l.id} href={`/lecture/${l.id}`} onClick={() => setOpen(false)}>{l.title}{l.free && <em>مجانية</em>}</Link>)}</>}
          {pages.length > 0 && <><small>صفحات</small>{pages.map(p => <Link key={p.href} href={p.href} onClick={() => setOpen(false)}>{p.label}</Link>)}</>}
          {!pages.length && !lec.length && <p>مفيش نتيجة. جرّب كلمة تانية.</p>}
        </div>
      </div></div>}
  </>;
}
