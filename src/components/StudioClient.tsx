"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Download, ImagePlus, Sparkles, X } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const SIZES = [{ id: "portrait", label: "بوستر طولي" }, { id: "square", label: "مربع" }, { id: "wide", label: "عرضي" }];
const IDEAS = ["بوستر لمهندس رياضيات يشرح على سبورة في فصل حديث بألوان الأزرق والذهبي", "مهندس بخوذة صفراء في موقع إنشاءات يحمل مخططات ومعادلات", "مدرس رياضيات واثق وسط أشكال هندسية مضيئة وخلفية مستقبلية"];

type Tpl = { id: string; name: string; l1: string; l2: string; accent: string; brand: string; pill: [string, string]; tint: string };
const TPLS: Tpl[] = [
  { id: "1", name: "مستقبلي", l1: "الرياضيات", l2: "بذكاء المهندس", accent: "#2ad4ff", brand: "#19b7ff", pill: ["#6d4cff", "#1ab2ff"], tint: "4,10,34" },
  { id: "2", name: "مخطط هندسي", l1: "هندس مستواك", l2: "في الرياضيات", accent: "#ffc928", brand: "#ffcb2e", pill: ["#ffb400", "#ffd84d"], tint: "6,26,77" },
  { id: "3", name: "أخضر وذهبي", l1: "جاهز", l2: "تبدأ الرحلة؟", accent: "#ffd23f", brand: "#ffcf33", pill: ["#f5b800", "#ffdb5c"], tint: "2,21,10" },
];
function fit(ctx: CanvasRenderingContext2D, text: string, font: (n: number) => string, start: number, max: number) {
  let n = start; ctx.font = font(n); while (n > 40 && ctx.measureText(text).width > max) { n -= 4; ctx.font = font(n); } return n;
}
async function drawPoster(canvas: HTMLCanvasElement, scene: string, t: Tpl, o: { l1: string; l2: string; pill: string; phone: string }) {
  await Promise.all(["900 80px Cairo", "800 40px Cairo"].map(f => document.fonts.load(f, "الرياضيات abc 0123")));
  const img = new Image(); img.src = scene; await img.decode();
  const W = 1080, H = 1350; canvas.width = W; canvas.height = H; const c = canvas.getContext("2d")!;
  const k = Math.max(W / img.width, H / img.height); const dw = img.width * k, dh = img.height * k; c.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  let g = c.createLinearGradient(0, 0, 0, 230); g.addColorStop(0, `rgba(${t.tint},.78)`); g.addColorStop(1, `rgba(${t.tint},0)`); c.fillStyle = g; c.fillRect(0, 0, W, 230);
  g = c.createLinearGradient(0, 860, 0, H); g.addColorStop(0, `rgba(${t.tint},0)`); g.addColorStop(.55, `rgba(${t.tint},.82)`); g.addColorStop(1, `rgba(${t.tint},.96)`); c.fillStyle = g; c.fillRect(0, 860, W, H - 860);
  c.textAlign = "center"; c.textBaseline = "middle"; c.direction = "rtl";
  c.shadowColor = "rgba(0,0,0,.55)"; c.shadowBlur = 14; c.shadowOffsetY = 3;
  c.fillStyle = t.brand; fit(c, "منصة مهندس فارس عماد", n => `800 ${n}px Cairo, sans-serif`, 56, 900); c.fillText("منصة مهندس فارس عماد", W / 2, 84);
  c.direction = "ltr"; c.fillStyle = "#e8ecf5"; c.font = "700 27px Arial, sans-serif"; (c as unknown as { letterSpacing: string }).letterSpacing = "5px"; c.fillText("ENG. FARES EMAD", W / 2, 148); (c as unknown as { letterSpacing: string }).letterSpacing = "0px"; c.direction = "rtl";
  c.shadowBlur = 22; c.shadowColor = `rgba(${t.tint},.9)`;
  if (o.l1.trim()) { c.fillStyle = "#fff"; fit(c, o.l1, n => `900 ${n}px Cairo, sans-serif`, 112, 960); c.fillText(o.l1, W / 2, 1040); }
  if (o.l2.trim()) { c.fillStyle = t.accent; fit(c, o.l2, n => `900 ${n}px Cairo, sans-serif`, 100, 960); c.fillText(o.l2, W / 2, 1156); }
  c.shadowBlur = 0; c.shadowOffsetY = 0;
  const pill = o.pill.trim();
  if (pill) {
    const x = 51, y = 1212, w = 978, h = 76, r = 38; const pg = c.createLinearGradient(x, 0, x + w, 0); pg.addColorStop(0, t.pill[0]); pg.addColorStop(1, t.pill[1]);
    c.fillStyle = pg; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill();
    c.fillStyle = "#14142b"; fit(c, pill, n => `800 ${n}px Cairo, sans-serif`, 32, 900); c.fillText(pill, W / 2, y + h / 2 + 2);
  }
  if (o.phone.trim()) { c.fillStyle = t.accent; fit(c, "للتواصل: \u2066" + o.phone + "\u2069", n => `800 ${n}px Cairo, sans-serif`, 32, 900); c.fillText("للتواصل: \u2066" + o.phone + "\u2069", W / 2, 1316); }
}

async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file); const s = Math.min(1, 768 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export default function StudioClient({ user }: { user: { name: string; role: string } }) {
  const [mode, setMode] = useState<"poster" | "free">("poster");
  const [prompt, setPrompt] = useState(""); const [size, setSize] = useState("portrait"); const [face, setFace] = useState("");
  const [busy, setBusy] = useState(false); const [img, setImg] = useState(""); const [err, setErr] = useState(""); const file = useRef<HTMLInputElement>(null);
  const [tpl, setTpl] = useState("1"); const T = TPLS.find(x => x.id === tpl)!;
  const [l1, setL1] = useState(TPLS[0].l1); const [l2, setL2] = useState(TPLS[0].l2);
  const [pill, setPill] = useState("الصف الأول · الثاني · الثالث الثانوي"); const [phone, setPhone] = useState("");
  const [scene, setScene] = useState(""); const [poster, setPoster] = useState(""); const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => { try { setPhone(localStorage.getItem("studio-phone") || ""); } catch {} }, []);
  useEffect(() => {
    if (!scene || !cv.current) return; let dead = false;
    drawPoster(cv.current, scene, T, { l1, l2, pill, phone }).then(() => { if (!dead && cv.current) setPoster(cv.current.toDataURL("image/png")); }).catch(() => setErr("تعذر تركيب البوستر. جرّب تاني."));
    return () => { dead = true; };
  }, [scene, tpl, l1, l2, pill, phone]); // eslint-disable-line react-hooks/exhaustive-deps
  function pickTpl(id: string) { const t = TPLS.find(x => x.id === id)!; setTpl(id); setL1(t.l1); setL2(t.l2); setScene(""); setPoster(""); }
  async function pick(f?: File) { if (!f) return; try { setFace(await shrink(f)); setErr(""); } catch { setErr("تعذر فتح الصورة. جرّب صورة تانية."); } }
  async function call(body: object) {
    const r = await fetch("/api/imagine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "تعذر توليد الصورة الآن."); return d.image as string;
  }
  async function go(e?: React.FormEvent) {
    e?.preventDefault(); if (busy) return;
    if (mode === "free" && prompt.trim().length < 4) return;
    if (mode === "poster" && !face) { setErr("ارفع صورة وجهك الأول."); return; }
    setBusy(true); setErr(""); setImg(""); setScene(""); setPoster("");
    try {
      if (mode === "poster") { try { localStorage.setItem("studio-phone", phone); } catch {} setScene(await call({ template: tpl, face })); }
      else setImg(await call({ prompt, size, face: face || undefined }));
    } catch (x) { setErr(x instanceof Error ? x.message : "تعذر الاتصال بالخادم. جرّب تاني."); }
    setBusy(false);
  }
  const facePicker = <>
    <input ref={file} type="file" accept="image/*" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }}/>
    {face ? <div className="sv-thumb"><img src={face} alt="صورة الوجه"/><button type="button" aria-label="إزالة الصورة" onClick={() => setFace("")}><X size={14}/></button></div>
      : <button type="button" className="btn btn-outline st-face" onClick={() => file.current?.click()}><Camera size={18}/> ارفع صورة وجهك</button>}
    <p className="sv-warn">استخدم صورة واضحة لوجهك أنت فقط أو لشخص وافق على كده.</p></>;
  return <div className="app-page"><SiteHeader user={user}/><main className="app-container sv-page st-page">
    <div className="page-head"><span className="section-kicker"><span/> للأعضاء</span><h1>استوديو الصور</h1><p>بوستر جاهز بصورتك وبالعربي المظبوط، أو صورة حرة من وصفك.</p></div>
    <div className="st-sizes st-modes" role="tablist" aria-label="نوع الصورة">
      <button type="button" role="tab" aria-selected={mode === "poster"} className={mode === "poster" ? "on" : ""} onClick={() => setMode("poster")}>بوستر جاهز</button>
      <button type="button" role="tab" aria-selected={mode === "free"} className={mode === "free" ? "on" : ""} onClick={() => setMode("free")}>صورة حرة</button></div>
    <form className="panel sv-card" onSubmit={go}>
      {mode === "poster" ? <>
        <span className="sv-label">اختار التصميم</span>
        <div className="st-tpls" role="radiogroup" aria-label="التصميم">{TPLS.map(t => <button type="button" role="radio" aria-checked={tpl === t.id} key={t.id} className={tpl === t.id ? "on" : ""} onClick={() => pickTpl(t.id)} style={{ ["--tc" as string]: t.accent, ["--tb" as string]: `rgb(${t.tint})` }}><i/>{t.name}</button>)}</div>
        <span className="sv-label" style={{ marginTop: 16 }}>صورة وجهك</span>{facePicker}
        <label className="sv-label" htmlFor="pl1" style={{ marginTop: 14 }}>العنوان (السطر الأول)</label><input id="pl1" className="input" value={l1} maxLength={40} onChange={e => setL1(e.target.value)}/>
        <label className="sv-label" htmlFor="pl2" style={{ marginTop: 12 }}>السطر التاني (ملوّن)</label><input id="pl2" className="input" value={l2} maxLength={40} onChange={e => setL2(e.target.value)}/>
        <label className="sv-label" htmlFor="pl3" style={{ marginTop: 12 }}>الشريط السفلي</label><input id="pl3" className="input" value={pill} maxLength={60} onChange={e => setPill(e.target.value)}/>
        <label className="sv-label" htmlFor="pl4" style={{ marginTop: 12 }}>رقم التواصل (اختياري)</label><input id="pl4" className="input" dir="ltr" inputMode="tel" value={phone} maxLength={30} onChange={e => setPhone(e.target.value)} placeholder="0100 000 0000"/>
        <p className="sv-warn">الكلام العربي بيتركّب فوق الصورة بخط مظبوط، فمفيش حروف مكسورة. غيّر النصوص وهتتحدّث المعاينة فوراً من غير ما تولّد صورة جديدة.</p>
      </> : <>
        <label className="sv-label" htmlFor="stp">وصف الصورة</label>
        <textarea id="stp" className="input sv-ta" value={prompt} maxLength={900} onChange={e => setPrompt(e.target.value)} placeholder="مثال: مهندس رياضيات يشرح على سبورة بألوان الأزرق والذهبي"/>
        <div className="sv-ex">{IDEAS.map(x => <button type="button" key={x} onClick={() => setPrompt(x)}>{x.length > 34 ? x.slice(0, 34) + "…" : x}</button>)}</div>
        <span className="sv-label" style={{ marginTop: 16 }}>المقاس</span>
        <div className="st-sizes" role="radiogroup" aria-label="مقاس الصورة">{SIZES.map(s => <button type="button" role="radio" aria-checked={size === s.id} className={size === s.id ? "on" : ""} key={s.id} onClick={() => setSize(s.id)}>{s.label}</button>)}</div>
        <span className="sv-label" style={{ marginTop: 16 }}>صورة الوجه (اختياري)</span>{facePicker}
        <p className="sv-warn">في الصورة الحرة الذكاء الاصطناعي مبيعرفش يكتب عربي صح، فالصورة بتطلع من غير كتابة. لو عايز بوستر بكلام عربي استخدم «بوستر جاهز».</p>
      </>}
      <div className="sv-actions"><button className="btn btn-primary" type="submit" disabled={busy || (mode === "free" && prompt.trim().length < 4)}>{busy ? "بنرسم..." : <><Sparkles size={18}/> {mode === "poster" ? "اعمل البوستر" : "ولّد الصورة"}</>}</button></div>
    </form>
    {err && <div role="alert" className="message error">{err}</div>}
    {busy && <section className="panel sv-card"><div className="sv-busy"><div className="loading-spinner"/> بنرسم الصورة، ياخد من 10 لـ30 ثانية...</div></section>}
    <canvas ref={cv} hidden/>
    {mode === "poster" && poster && <section className="panel sv-card st-result"><img src={poster} alt="البوستر النهائي" className="st-img"/>
      <div className="sv-actions"><a className="btn btn-primary" href={poster} download="fares-emad-poster.png"><Download size={18}/> تحميل البوستر</a><button type="button" className="btn btn-outline" onClick={go} disabled={busy}><ImagePlus size={18}/> مشهد جديد</button></div>
      <p className="sv-warn">المشهد من الذكاء الاصطناعي والنصوص مركّبة فوقه. راجع الشبه والتفاصيل قبل ما تنشر.</p></section>}
    {mode === "free" && img && <section className="panel sv-card st-result"><img src={img} alt="الصورة المولّدة" className="st-img"/>
      <div className="sv-actions"><a className="btn btn-primary" href={img} download="fares-emad-image.png"><Download size={18}/> تحميل الصورة</a><button type="button" className="btn btn-outline" onClick={go} disabled={busy}><ImagePlus size={18}/> صورة جديدة بنفس الوصف</button></div>
      <p className="sv-warn">صورة بالذكاء الاصطناعي. أضف الكلام العربي بنفسك بعد التحميل لأن الذكاء الاصطناعي بيغلط في كتابة العربي.</p></section>}
  </main></div>;
}
