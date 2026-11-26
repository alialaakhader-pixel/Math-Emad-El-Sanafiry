"use client";
import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";

type Lec = { id: string; title: string; locked: boolean; reason: string | null; best: number | null };
type Stu = { name: string; email: string; studentCode: string | null; grade: string | null };

export default function TeamClient({ user }: { user: { name: string; role: string } }) {
  const [code, setCode] = useState(""); const [stu, setStu] = useState<Stu | null>(null); const [lecs, setLecs] = useState<Lec[]>([]);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function find(c = code) {
    setErr(""); setMsg(""); setStu(null); setLecs([]);
    const clean = c.replace(/\D/g, "");
    if (!clean) { setErr("اكتب رقم الطالب."); return; }
    setBusy(true);
    try { const r = await fetch(`/api/team?code=${clean}`); const d = await r.json(); if (!r.ok) throw new Error(d.error); setStu(d.student); setLecs(d.lectures); }
    catch (e) { setErr(e instanceof Error ? e.message : "تعذر البحث."); } finally { setBusy(false); }
  }
  async function unlock(lectureId: string) {
    setErr(""); setMsg(""); setBusy(true);
    try { const r = await fetch("/api/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.replace(/\D/g, ""), lectureId }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setMsg(d.message); await find(); setMsg(d.message); }
    catch (e) { setErr(e instanceof Error ? e.message : "تعذر الفتح."); } finally { setBusy(false); }
  }
  return <div className="app-page"><SiteHeader user={user}/><main className="app-container">
    <div className="page-head"><span className="section-kicker">فريق المدرس</span><h1>لوحة الفريق وخدمة العملاء</h1><p>افتح محاضرة جديدة لأي طالب برقمه (ID) بعد التواصل معاك.</p></div>
    <section className="panel"><h2>ابحث بالرقم</h2>
      <form className="form-actions" onSubmit={e => { e.preventDefault(); find(); }}>
        <input className="input" dir="ltr" inputMode="numeric" placeholder="رقم الطالب مثل 482913" value={code} onChange={e => setCode(e.target.value)} style={{ maxWidth: 260 }}/>
        <button className="btn btn-primary" disabled={busy}>بحث</button>
      </form>
      {err && <div className="message error">{err}</div>}{msg && <div className="message">{msg}</div>}
    </section>
    {stu && <section className="panel" style={{ marginTop: 16 }}>
      <h2>{stu.name}</h2><p className="small">{stu.email} · {stu.grade || "بدون صف"} · الرقم <b dir="ltr">{stu.studentCode}</b></p>
      {lecs.length ? lecs.map(l => <div className="list-row" key={l.id}><div className="list-row-main"><strong>{l.title}</strong><small>{l.locked ? (l.reason === "below" ? `مقفولة (أعلى درجة في الواجب ${l.best}٪)` : "مقفولة (لم يحل الواجب بعد)") : "مفتوحة"}</small></div>
        <div className="list-row-actions">{l.locked ? <button className="btn btn-primary" disabled={busy} onClick={() => unlock(l.id)}>فتح للطالب</button> : <span className="tag success">مفتوحة</span>}</div></div>) : <p className="muted">لا توجد محاضرات منشورة لصف الطالب.</p>}
    </section>}
  </main></div>;
}
