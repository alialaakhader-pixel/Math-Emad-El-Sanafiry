"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, FileUp } from "lucide-react";

type Sub = { body: string; status: string; comment: string; at: string; assetId: string | null; fileName: string | null } | null;

export default function SubmitWork({ examId, kind }: { examId: string; kind: string }) {
  const [sub, setSub] = useState<Sub | undefined>(undefined);
  const [text, setText] = useState(""); const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState(false);
  const load = () => fetch(`/api/submissions?examId=${examId}`, { cache: "no-store" }).then(r => r.json()).then(d => { setSub(d.submission ?? null); if (d.submission) setText(d.submission.body); }).catch(() => setSub(null));
  useEffect(() => { load(); }, [examId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function submit() {
    setBusy(true); setMsg(""); setErr(false);
    try {
      let assetId: string | undefined;
      if (file) {
        const f = new FormData(); f.append("action", "uploadAnswer"); f.append("file", file);
        const u = await fetch("/api/student", { method: "POST", body: f }); const ud = await u.json();
        if (!u.ok) throw new Error(ud.error || "الرفع فشل.");
        assetId = ud.assetId;
      }
      const r = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examId, text, assetId }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "التسليم فشل.");
      setMsg(d.message); setFile(null); await load();
    } catch (e) { setErr(true); setMsg(e instanceof Error ? e.message : "حصلت مشكلة."); } finally { setBusy(false); }
  }
  if (sub === undefined) return null;
  return <section className="panel" style={{ marginBottom: 18 }}>
    <h2>{kind === "homework" ? "سلّم الواجب" : "سلّم إجاباتك"}</h2>
    <p className="small" style={{ marginTop: -8 }}>اكتب إجابتك أو صوّر ورقتك أو ارفع ملف (صورة أو PDF حتى 4 ميجا).</p>
    {sub && <div className="hw-state"><span className={`tag ${sub.status === "reviewed" ? "success" : "purple"}`}>{sub.status === "reviewed" ? <><CheckCircle2 size={12}/> المدرس راجعه</> : "اتسلّم · مستني المراجعة"}</span>{sub.assetId && <a className="inline-action" href={`/api/files/${sub.assetId}`} target="_blank" rel="noreferrer">{sub.fileName || "الملف المرفوع"}</a>}</div>}
    {sub?.comment && <div className="hw-comment"><strong>تعليق المدرس:</strong><br/>{sub.comment}</div>}
    <div className="form-field"><label>إجابتك</label><textarea className="input" maxLength={4000} value={text} onChange={e => setText(e.target.value)} placeholder="اكتب حلّك هنا..."/></div>
    <div className="form-field"><label><FileUp size={13} style={{ display: "inline", verticalAlign: "middle" }}/> صورة أو ملف</label><input className="input" type="file" accept="image/png,image/jpeg,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)}/></div>
    {msg && <div className={`message ${err ? "error" : ""}`} role="status">{msg}</div>}
    <button className="btn btn-primary" disabled={busy || (!text.trim() && !file && !sub?.assetId)} onClick={submit}>{busy ? "بيتسلّم..." : sub ? "حدّث التسليم" : "سلّم"}</button>
  </section>;
}
