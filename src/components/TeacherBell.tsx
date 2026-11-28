"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

type It = { href: string; title: string; n: number };
export default function TeacherBell() {
  const [d, setD] = useState<{ total: number; items: It[] }>({ total: 0, items: [] }); const [open, setOpen] = useState(false); const box = useRef<HTMLDivElement>(null);
  const load = () => fetch("/api/admin/alerts", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(x => x && setD(x)).catch(() => {});
  useEffect(() => { load(); const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000); return () => clearInterval(t); }, []);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, [open]);
  return <div className="bell-wrap" ref={box}>
    <button type="button" className="icon-button bell-btn" aria-label={`تنبيهات المدرس${d.total ? ` (${d.total})` : ""}`} onClick={() => { setOpen(!open); if (!open) load(); }}><Bell size={19}/>{d.total > 0 && <span className="bell-badge">{d.total > 9 ? "9+" : d.total}</span>}</button>
    {open && <div className="bell-panel"><div className="bell-head"><strong>محتاج انتباهك</strong></div><div className="bell-list">
      {!d.items.length && <p className="bell-empty">مفيش حاجة مستنياك. كله تمام.</p>}
      {d.items.map(i => <Link key={i.href} href={i.href} className="bell-item unread" onClick={() => setOpen(false)}><span className="bell-item-dot"/><span className="bell-item-text"><strong>{i.n} {i.title}</strong></span></Link>)}
    </div></div>}
  </div>;
}
