"use client";
import { useRef, useState } from "react";
import { Camera, Download, ImagePlus, Sparkles, X } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const SIZES = [{ id: "portrait", label: "بوستر طولي" }, { id: "square", label: "مربع" }, { id: "wide", label: "عرضي" }];
const IDEAS = ["بوستر لمهندس رياضيات يشرح على سبورة في فصل حديث بألوان الأزرق والذهبي", "مهندس بخوذة صفراء في موقع إنشاءات يحمل مخططات ومعادلات", "مدرس رياضيات واثق وسط أشكال هندسية مضيئة وخلفية مستقبلية"];

async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file); const s = Math.min(1, 768 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export default function StudioClient({ user }: { user: { name: string; role: string } }) {
  const [prompt, setPrompt] = useState(""); const [size, setSize] = useState("portrait"); const [face, setFace] = useState("");
  const [busy, setBusy] = useState(false); const [img, setImg] = useState(""); const [err, setErr] = useState(""); const file = useRef<HTMLInputElement>(null);
  async function pick(f?: File) { if (!f) return; try { setFace(await shrink(f)); setErr(""); } catch { setErr("تعذر فتح الصورة. جرّب صورة تانية."); } }
  async function go(e?: React.FormEvent) {
    e?.preventDefault(); if (busy || prompt.trim().length < 4) return; setBusy(true); setErr(""); setImg("");
    try {
      const r = await fetch("/api/imagine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, size, face: face || undefined }) });
      const d = await r.json().catch(() => ({})); if (!r.ok) setErr(d.error || "تعذر توليد الصورة الآن."); else setImg(d.image);
    } catch { setErr("تعذر الاتصال بالخادم. تأكد من الإنترنت وجرّب تاني."); }
    setBusy(false);
  }
  return <div className="app-page"><SiteHeader user={user}/><main className="app-container sv-page st-page">
    <div className="page-head"><span className="section-kicker"><span/> للأعضاء</span><h1>استوديو الصور</h1><p>اكتب وصف الصورة وهنولّدهالك بالذكاء الاصطناعي. ولو عايز شكلك أنت فيها، ارفع صورة وجهك.</p></div>
    <form className="panel sv-card" onSubmit={go}>
      <label className="sv-label" htmlFor="stp">وصف الصورة</label>
      <textarea id="stp" className="input sv-ta" value={prompt} maxLength={900} onChange={e => setPrompt(e.target.value)} placeholder="مثال: بوستر لمهندس رياضيات يشرح على سبورة بألوان الأزرق والذهبي"/>
      <div className="sv-ex">{IDEAS.map(x => <button type="button" key={x} onClick={() => setPrompt(x)}>{x.length > 34 ? x.slice(0, 34) + "…" : x}</button>)}</div>
      <span className="sv-label" style={{ marginTop: 16 }}>المقاس</span>
      <div className="st-sizes" role="radiogroup" aria-label="مقاس الصورة">{SIZES.map(s => <button type="button" role="radio" aria-checked={size === s.id} className={size === s.id ? "on" : ""} key={s.id} onClick={() => setSize(s.id)}>{s.label}</button>)}</div>
      <span className="sv-label" style={{ marginTop: 16 }}>صورة الوجه (اختياري)</span>
      <input ref={file} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }}/>
      {face ? <div className="sv-thumb"><img src={face} alt="صورة الوجه"/><button type="button" aria-label="إزالة الصورة" onClick={() => setFace("")}><X size={14}/></button></div>
        : <button type="button" className="btn btn-outline st-face" onClick={() => file.current?.click()}><Camera size={18}/> ارفع صورة وجهك</button>}
      <p className="sv-warn">استخدم صورة واضحة لوجهك أنت فقط أو لشخص وافق على كده.</p>
      <div className="sv-actions"><button className="btn btn-primary" type="submit" disabled={busy || prompt.trim().length < 4}>{busy ? "بنرسم..." : <><Sparkles size={18}/> ولّد الصورة</>}</button></div>
    </form>
    {err && <div role="alert" className="message error">{err}</div>}
    {busy && <section className="panel sv-card"><div className="sv-busy"><div className="loading-spinner"/> بنرسم الصورة، ياخد من 10 لـ30 ثانية...</div></section>}
    {img && <section className="panel sv-card st-result"><img src={img} alt="الصورة المولّدة" className="st-img"/>
      <div className="sv-actions"><a className="btn btn-primary" href={img} download="fares-emad-image.png"><Download size={18}/> تحميل الصورة</a><button type="button" className="btn btn-outline" onClick={go} disabled={busy}><ImagePlus size={18}/> صورة جديدة بنفس الوصف</button></div>
      <p className="sv-warn">صورة بالذكاء الاصطناعي. أضف الكلام العربي بنفسك بعد التحميل لأن الذكاء الاصطناعي بيغلط في كتابة العربي.</p></section>}
  </main></div>;
}
