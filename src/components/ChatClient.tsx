"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Send, Trash2, ShieldCheck } from "lucide-react";

type M = { id: string; body: string; at: string; mine: boolean; name: string; grade: string | null; flags?: number; iFlagged: boolean };
type Grade = { id: string; title: string };
const t = (iso: string) => new Date(iso).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });

export default function ChatClient({ teacher = false, grades = [] }: { teacher?: boolean; grades?: Grade[] }) {
  const [msgs, setMsgs] = useState<M[]>([]); const [grade, setGrade] = useState<string | null>(null);
  const [needGrade, setNeedGrade] = useState(false); const [text, setText] = useState(""); const [err, setErr] = useState(""); const [info, setInfo] = useState("");
  const [gid, setGid] = useState(grades[0]?.id || ""); const [flagged, setFlagged] = useState(false); const [flaggedTotal, setFlaggedTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const end = useRef<HTMLDivElement>(null); const box = useRef<HTMLDivElement>(null); const stick = useRef(true);
  const load = useCallback(async () => {
    const q = teacher ? `?gradeId=${gid}${flagged ? "&flagged=1" : ""}` : "";
    const d = await fetch("/api/chat" + q, { cache: "no-store" }).then(r => r.json()).catch(() => null);
    if (!d) return; setMsgs(d.messages || []); setGrade(d.grade); setNeedGrade(!!d.needGrade); setFlaggedTotal(d.flaggedTotal || 0); setLoaded(true);
  }, [teacher, gid, flagged]);
  useEffect(() => { setLoaded(false); load(); const i = setInterval(() => { if (document.visibilityState === "visible") load(); }, 4000); return () => clearInterval(i); }, [load]);
  useEffect(() => { if (stick.current) box.current?.scrollTo({ top: box.current.scrollHeight }); }, [msgs]);
  const post = (b: object) => fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(async r => ({ ok: r.ok, d: await r.json() }));
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!text.trim()) return; setErr("");
    const { ok, d } = await post({ text }); if (!ok) { setErr(d.error || "فشل الإرسال."); return; }
    setText(""); stick.current = true; load();
  }
  async function flag(id: string) { const { d } = await post({ action: "flag", id }); setInfo(d.message || d.error || ""); setMsgs(x => x.map(m => m.id === id ? { ...m, iFlagged: true } : m)); }
  async function del(id: string) { if (!confirm("تحذف الرسالة دي؟")) return; await post({ action: "delete", id }); load(); }
  async function clear(id: string) { await post({ action: "clearFlags", id }); load(); }
  if (!teacher && needGrade) return <div className="panel empty-state"><h3>اختار صفك الأول</h3><p>الشات متاح لطلاب صفك بس.</p><a className="btn btn-primary" href="/welcome">اختار صفك</a></div>;
  return <div className="chat-shell">
    {teacher && <div className="form-actions" style={{ marginBottom: 12 }}>
      <select className="input" style={{ maxWidth: 240 }} value={gid} onChange={e => setGid(e.target.value)}>{grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
      <button className={`btn ${flagged ? "btn-primary" : "btn-outline"}`} onClick={() => setFlagged(!flagged)}><Flag size={14}/> المبلّغ عنها ({flaggedTotal})</button>
    </div>}
    <div className="chat-head"><strong>{flagged && teacher ? "كل الرسائل المبلّغ عنها" : `شات ${grade || ""}`}</strong>{teacher ? <span className="tag purple"><ShieldCheck size={12}/> مراقبة</span> : <span className="tag">المدرس بيشوف الشات</span>}</div>
    <div className="chat-list" ref={box} onScroll={e => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {loaded && !msgs.length && <p className="bell-empty">{flagged ? "مفيش رسائل مبلّغ عنها." : "الشات فاضي. ابدأ إنت الكلام!"}</p>}
      {msgs.map(m => <div key={m.id} className={`chat-msg ${m.mine ? "mine" : ""} ${m.flags ? "flagged" : ""}`}>
        <div className="chat-meta"><b>{m.name}</b>{m.grade && <span className="tag">{m.grade}</span>}<small>{t(m.at)}</small></div>
        <div className="chat-body">{m.body}</div>
        <div className="chat-actions">
          {teacher && !!m.flags && <><span className="tag warn">{m.flags} بلاغ</span><button className="inline-action" onClick={() => clear(m.id)}>تجاهل البلاغ</button></>}
          {teacher && <button className="inline-action danger" onClick={() => del(m.id)}><Trash2 size={13}/> حذف</button>}
          {!teacher && !m.mine && <button className="inline-action" disabled={m.iFlagged} onClick={() => flag(m.id)}><Flag size={13}/> {m.iFlagged ? "اتبلّغ" : "بلّغ"}</button>}
        </div>
      </div>)}<div ref={end}/>
    </div>
    {info && <div className="message info" role="status">{info}</div>}
    {!teacher && <form className="chat-form" onSubmit={send}>
      <input className="input" value={text} maxLength={400} onChange={e => setText(e.target.value)} placeholder="اكتب رسالة لزمايلك..." aria-label="رسالة"/>
      <button className="btn btn-primary" aria-label="إرسال"><Send size={16}/></button>
    </form>}
    {err && <div className="message error" role="status">{err}</div>}
    {!teacher && <p className="muted small">نص بس، من غير صور. خلّي كلامك محترم، والمدرس بيراجع الشات.</p>}
  </div>;
}
