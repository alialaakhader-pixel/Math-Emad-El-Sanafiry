"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Camera, Copy, Check, Share2, Sparkles, ShieldCheck, X, ArrowUpLeft, RefreshCw } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const EX = ["حل المعادلة x^2 - 5x + 6 = 0", "جد مشتقة sin(x)·e^x", "سيارة تسير 90 كم في ساعة ونصف، ما سرعتها؟", "احسب 12.5% من 480"];

// Shrink a phone photo before upload: max 1280 px, JPEG.
async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file); const s = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}
function Answer({ text }: { text: string }) {
  return <div className="sv-text" dir="auto">{text.split("\n").map((l, i) => {
    const m = l.match(/^(المطلوب|المعطيات|التحقق|الإجابة النهائية|الحل)\s*[:：]\s*(.*)$/);
    const final = m && m[1] === "الإجابة النهائية";
    if (!l.trim()) return <div key={i} className="sv-gap"/>;
    return <p key={i} className={final ? "sv-final" : undefined}>{m ? <><b>{m[1]}:</b> {m[2]}</> : l.replace(/\*\*/g, "")}</p>;
  })}</div>;
}

export default function SolveClient({ user }: { user?: { name: string; role: string } }) {
  const [q, setQ] = useState(""); const [img, setImg] = useState(""); const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ answer: string; verified: boolean; checked?: boolean; corrected?: boolean; transcript?: string } | null>(null); const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false); const [shared, setShared] = useState(false); const file = useRef<HTMLInputElement>(null);
  async function pick(f?: File) { if (!f) return; try { setImg(await shrink(f)); setErr(""); } catch { setErr("تعذر فتح الصورة. جرّب صورة تانية."); } }
  async function go(e?: React.FormEvent) {
    e?.preventDefault(); if (busy || (!q.trim() && !img)) return; setBusy(true); setErr(""); setRes(null);
    try {
      const r = await fetch("/api/solve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, image: img || undefined }) });
      const d = await r.json().catch(() => ({})); if (!r.ok) setErr(d.error || "تعذر الحل الآن."); else setRes(d);
    } catch { setErr("تعذر الاتصال بالخادم. تأكد من الإنترنت وجرّب تاني."); }
    setBusy(false);
  }
  async function copy() { if (!res) return; try { await navigator.clipboard.writeText(res.answer); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }
  async function share() { const url = location.href; try { if (navigator.share) await navigator.share({ title: "حلّال المسائل", url }); else { await navigator.clipboard.writeText(url); } setShared(true); setTimeout(() => setShared(false), 1500); } catch {} }
  function reset() { setQ(""); setImg(""); setRes(null); setErr(""); }
  return <div className="app-page"><SiteHeader user={user}/><main className="app-container sv-page">
    <div className="page-head"><span className="section-kicker"><span/> للطلاب وللجميع</span><h1>حلّال المسائل</h1><p>اكتب أي مسألة أو صوّرها: رياضيات، فيزياء، كيمياء، مسائل كلامية. هتاخد حل خطوة بخطوة. مش لازم حساب.</p></div>
    <form className="panel sv-card" onSubmit={go}>
      <label htmlFor="sv-q" className="sv-label">المسألة</label>
      <textarea id="sv-q" className="input sv-ta" dir="auto" maxLength={2000} value={q} onChange={e => setQ(e.target.value)} placeholder="مثال: حل المعادلة x^2 - 5x + 6 = 0" onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) go(); }}/>
      {img && <div className="sv-thumb"><img src={img} alt="صورة المسألة"/><button type="button" aria-label="شيل الصورة" onClick={() => setImg("")}><X size={16}/></button></div>}
      <input ref={file} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }}/>
      <div className="sv-actions"><button type="button" className="btn btn-outline" onClick={() => file.current?.click()}><Camera size={16}/> صوّر المسألة</button>
        <button className="btn btn-primary" disabled={busy || (!q.trim() && !img)}>{busy ? "بحلّها..." : "حلّ المسألة"}{!busy && <ArrowUpLeft size={16}/>}</button></div>
      {!q && !img && <div className="sv-ex">{EX.map(x => <button type="button" key={x} onClick={() => setQ(x)}>{x}</button>)}</div>}
    </form>
    {busy && <div className="panel sv-card sv-busy" role="status"><div className="loading-spinner"/> بقرا المسألة وبحلّها خطوة خطوة...</div>}
    {err && <div className="message error" role="alert">{err}</div>}
    {res && <section className="panel sv-card sv-res" aria-live="polite">
      <div className="sv-head">{res.verified ? <span className="sv-badge ok"><ShieldCheck size={14}/> حل محسوب بدقة</span> : <span className="sv-badge"><Sparkles size={14}/> {res.corrected ? "حل بالذكاء الاصطناعي بعد مراجعة وتصحيح" : res.checked ? "حل بالذكاء الاصطناعي وراجعته مرة تانية" : "حل بالذكاء الاصطناعي"}</span>}</div>
      {res.transcript && <div className="sv-read"><small>اللي قريته من الصورة:</small><p dir="auto">{res.transcript}</p><small>لو غلط، عدّل النص فوق واضغط حلّ تاني.</small></div>}
      <Answer text={res.answer}/>
      {!res.verified && <p className="sv-warn">الذكاء الاصطناعي ممكن يغلط. راجع الخطوات وتحقق من الإجابة قبل ما تعتمد عليها.</p>}
      <div className="sv-actions"><button type="button" className="btn btn-outline" onClick={copy}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "اتنسخ" : "انسخ الحل"}</button><button type="button" className="btn btn-outline" onClick={share}>{shared ? <Check size={16}/> : <Share2 size={16}/>} شارك الصفحة</button><button type="button" className="btn btn-outline" onClick={reset}><RefreshCw size={16}/> مسألة جديدة</button></div>
    </section>}
    <p className="small sv-foot">عايز تتعلم الفكرة مش بس الحل؟ جرّب <Link href="/tutor">المعلم الذكي</Link> أو <Link href="/practice">تدرّب</Link> داخل المنصة.</p>
  </main></div>;
}
