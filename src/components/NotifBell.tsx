"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

type N = { id: string; title: string; body: string; at: string; unread: boolean };
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "دلوقتي";
  if (m < 60) return `من ${m} دقيقة`;
  if (m < 1440) return `من ${Math.round(m / 60)} ساعة`;
  return `من ${Math.round(m / 1440)} يوم`;
};

export default function NotifBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<N[]>([]);
  const [loaded, setLoaded] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const load = useCallback(() => fetch("/api/notifications", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(d => { if (d) { setUnread(d.unread); setItems(d.items); setLoaded(true); } }).catch(() => {}), []);
  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === "visible") load(); }, 60000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [open]);
  const post = (body: object) => fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  async function readAll() { setItems(x => x.map(n => ({ ...n, unread: false }))); setUnread(0); await post({ action: "readAll" }); }
  async function readOne(id: string) { setItems(x => x.map(n => n.id === id ? { ...n, unread: false } : n)); setUnread(u => Math.max(0, u - 1)); await post({ action: "read", id }); }
  return <div className="bell-wrap" ref={box}>
    <button type="button" className="icon-button bell-btn" aria-label={`الإشعارات${unread ? ` (${unread} جديد)` : ""}`} aria-expanded={open} onClick={() => { setOpen(!open); if (!open) load(); }}>
      <Bell size={19}/>{unread > 0 && <span className="bell-badge">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div className="bell-panel" role="dialog" aria-label="الإشعارات">
      <div className="bell-head"><strong>الإشعارات</strong>{unread > 0 && <button type="button" className="inline-action" onClick={readAll}><CheckCheck size={14}/> قراءة الكل</button>}</div>
      <div className="bell-list">
        {!loaded && <p className="bell-empty">جارٍ التحميل...</p>}
        {loaded && !items.length && <p className="bell-empty">مفيش إشعارات لسه. أول ما المدرس ينشر محاضرة أو امتحان هتلاقيه هنا.</p>}
        {items.map(n => <button type="button" key={n.id} className={`bell-item ${n.unread ? "unread" : ""}`} onClick={() => n.unread && readOne(n.id)}>
          <span className="bell-item-dot"/><span className="bell-item-text"><strong>{n.title}</strong><small>{n.body}</small><em>{ago(n.at)}</em></span>
        </button>)}
      </div>
    </div>}
  </div>;
}
