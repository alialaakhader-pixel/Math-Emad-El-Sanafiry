"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

type Item = { id: string; body: string; status: string; comment: string; at: string; assetId: string | null; fileName: string | null; mime: string | null; student: string; grade: string | null; exam: string; kind: string };
const fmt = (v: string) => new Date(v).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function SubmissionsAdmin() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [filter, setFilter] = useState<"new" | "all">("new");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(""); const [msg, setMsg] = useState("");
  const load = () => fetch("/api/submissions", { cache: "no-store" }).then(r => r.json()).then(d => { setItems(d.items || []); setNotes(n => { const o = { ...n }; for (const i of d.items || []) if (o[i.id] === undefined) o[i.id] = i.comment; return o; }); }).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  async function review(id: string) {
    setBusy(id); setMsg("");
    const r = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, comment: notes[id] || "" }) });
    const d = await r.json(); setMsg(d.message || d.error || ""); setBusy(""); load();
  }
  if (!items) return <div className="loading-block"><div className="loading-spinner"/> جارٍ التحميل...</div>;
  const shown = items.filter(i => filter === "all" || i.status === "submitted");
  const pending = items.filter(i => i.status === "submitted").length;
  return <section className="panel">
    <h2>تسليمات الطلاب</h2>
    <div className="form-actions" style={{ marginBottom: 14 }}>
      <button className={`btn ${filter === "new" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("new")}>مستنية مراجعة ({pending})</button>
      <button className={`btn ${filter === "all" ? "btn-primary" : "btn-outline"}`} onClick={() => setFilter("all")}>الكل ({items.length})</button>
    </div>
    {msg && <div className="message" role="status">{msg}</div>}
    {!shown.length && <div className="empty-state compact"><ClipboardCheck size={26}/><h3>{filter === "new" ? "مفيش تسليمات مستنية" : "لسه مفيش تسليمات"}</h3><p>لما طالب يسلّم واجب أو امتحان هيظهر هنا باسمه وصفه.</p></div>}
    {shown.map(i => <div key={i.id} className={`sub-card ${i.status === "submitted" ? "new" : ""}`}>
      <div className="hw-state" style={{ marginBottom: 4 }}><strong>{i.student}</strong><span className="tag">{i.grade || "—"}</span><span className={`tag ${i.status === "reviewed" ? "success" : "warn"}`}>{i.status === "reviewed" ? "اتراجع" : "جديد"}</span></div>
      <small className="muted">{i.kind === "homework" ? "واجب" : "امتحان"}: {i.exam} · {fmt(i.at)}</small>
      {i.body && <div className="sub-body">{i.body}</div>}
      {i.assetId && (i.mime?.startsWith("image/") ? <a href={`/api/files/${i.assetId}`} target="_blank" rel="noreferrer"><img className="sub-img" src={`/api/files/${i.assetId}`} alt={i.fileName || "تسليم"}/></a> : <a className="inline-action" href={`/api/files/${i.assetId}`} target="_blank" rel="noreferrer">افتح الملف: {i.fileName}</a>)}
      <div className="form-field" style={{ marginTop: 10 }}><label>تعليقك للطالب (اختياري)</label><textarea className="input" style={{ minHeight: 64 }} maxLength={1000} value={notes[i.id] ?? ""} onChange={e => setNotes({ ...notes, [i.id]: e.target.value })} placeholder="مثلا: حل ممتاز، راجع الخطوة التانية"/></div>
      <button className="btn btn-primary" disabled={busy === i.id} onClick={() => review(i.id)}><CheckCircle2 size={15}/> {i.status === "reviewed" ? "حدّث التعليق" : "تمت المراجعة"}</button>
    </div>)}
  </section>;
}
