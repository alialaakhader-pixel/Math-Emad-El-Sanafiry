"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardPaste, Eye, FilePlus2, Sparkles, Video } from "lucide-react";

type Grade = { id: string; title: string };
type Mode = "lecture" | "auto" | "exam" | "lectures";
type Preview = { count: number; items: Record<string, unknown>[]; errors: { line?: number; block?: number; text: string; error: string }[] } | null;
const modes: { id: Mode; title: string; icon: typeof Video }[] = [{ id: "lecture", title: "محاضرة", icon: Video }, { id: "auto", title: "امتحان من البنك", icon: Sparkles }, { id: "exam", title: "لصق امتحان", icon: ClipboardPaste }, { id: "lectures", title: "لصق محاضرات", icon: FilePlus2 }];
const LEC_HINT = "المحاضرة الأولى | https://youtu.be/xxxx | وصف قصير\nالمحاضرة التانية | https://youtu.be/yyyy\nمحاضرة من غير فيديو";
const EXAM_HINT = "س: ما قيمة نهاية (x²−1)/(x−1) عند 1؟\nأ) 0\nب) 1\nج) 2\nد) ∞\nالإجابة: ج\nالشرح: نختصر (x−1) فتبقى x+1.\n\nس: السؤال التاني...";

export default function QuickAdd({ grades, onDone }: { grades: Grade[]; onDone: () => void }) {
  const [mode, setMode] = useState<Mode>("lecture");
  const [gradeId, setGradeId] = useState("");
  const [title, setTitle] = useState(""); const [video, setVideo] = useState(""); const [notes, setNotes] = useState(""); const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState(""); const [kind, setKind] = useState("exam"); const [duration, setDuration] = useState(30); const [attempts, setAttempts] = useState(1);
  const [count, setCount] = useState(10); const [topics, setTopics] = useState<{ topic: string; n: number }[]>([]); const [picked, setPicked] = useState<string[]>([]);
  const [publish, setPublish] = useState(false);
  const [preview, setPreview] = useState<Preview>(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [err, setErr] = useState(false);
  useEffect(() => {
    setPicked([]); setTopics([]);
    if (mode === "auto" && gradeId) fetch(`/api/admin/content?gradeId=${gradeId}`).then(r => r.json()).then(d => setTopics(d.topics || [])).catch(() => {});
  }, [mode, gradeId]);
  useEffect(() => { setPreview(null); }, [mode, gradeId, title, video, notes, text, count, picked, kind]);
  useEffect(() => { setMsg(""); }, [mode, gradeId]);
  useEffect(() => { setText(""); }, [mode]);

  const payload = (dryRun: boolean) => {
    const base = { gradeId, published: publish, dryRun };
    if (mode === "lecture") return { ...base, action: "quickLecture", title, videoUrl: video, description: notes };
    if (mode === "lectures") return { ...base, action: "bulkLectures", text };
    const exam = { ...base, title, kind, durationMinutes: duration, maxAttempts: attempts };
    return mode === "auto" ? { ...exam, action: "autoExam", count, topics: picked } : { ...exam, action: "bulkExam", text };
  };
  async function run(dryRun: boolean) {
    if (!gradeId) { setErr(true); setMsg("اختار الصف الأول."); return; }
    setBusy(true); setMsg(""); setErr(false);
    try {
      const r = await fetch("/api/admin/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(dryRun)) });
      const d = await r.json();
      if (dryRun) { if (!r.ok) throw new Error(d.error || "تعذر المعاينة."); setPreview({ count: d.count, items: d.items, errors: d.errors || [] }); return; }
      if (!r.ok) { setPreview(d.errors ? { count: 0, items: [], errors: d.errors } : null); throw new Error(d.error || "تعذر الحفظ."); }
      if (mode === "lecture" && file && d.ids?.[0]) {
        const f = new FormData(); f.set("action", "uploadAsset"); f.set("lectureId", d.ids[0]); f.set("file", file);
        const u = await fetch("/api/admin", { method: "POST", body: f }); const ud = await u.json();
        if (!u.ok) { setErr(true); setMsg(`${d.message} لكن الملف ما اترفعش: ${ud.error || "حاول تاني من المحاضرات والملفات."}`); onDone(); return; }
      }
      setMsg(d.message + (mode === "lecture" && file ? " واترفع الملف." : "")); setPreview(null);
      setTitle(""); setVideo(""); setNotes(""); setText(""); setFile(null); onDone();
    } catch (e) { setErr(true); setMsg(e instanceof Error ? e.message : "تعذر الاتصال بالخادم."); }
    finally { setBusy(false); }
  }
  const isExam = mode === "auto" || mode === "exam";
  const needsText = mode === "exam" || mode === "lectures";
  const canPreview = mode === "lecture" ? title.trim().length > 1 : mode === "auto" ? title.trim().length > 1 : text.trim().length > 3 && (mode === "lectures" || title.trim().length > 1);
  return <section className="panel quick-add">
    <h2>إضافة سريعة</h2>
    <p className="small">اختار النوع، راجع المعاينة، وبعدين انشر. الافتراضي مسودة ومش بتظهر للطلاب لحد ما تنشرها.</p>
    <div className="app-tabs qa-modes" role="tablist">{modes.map(m => <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} className={mode === m.id ? "active" : ""} onClick={() => setMode(m.id)}><m.icon size={15}/>{m.title}</button>)}</div>
    <div className="form-field"><label htmlFor="qa-grade">الصف *</label><select id="qa-grade" className="input" value={gradeId} onChange={e => setGradeId(e.target.value)}><option value="">اختر الصف</option>{grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
    {(mode === "lecture" || isExam) && <div className="form-field"><label htmlFor="qa-title">{mode === "lecture" ? "عنوان المحاضرة *" : "عنوان الامتحان *"}</label><input id="qa-title" className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={mode === "lecture" ? "مثال: النهايات الدرس الأول" : "مثال: امتحان على النهايات"}/></div>}
    {mode === "lecture" && <>
      <div className="form-field"><label htmlFor="qa-video">رابط الفيديو (https، اختياري)</label><input id="qa-video" className="input" dir="ltr" value={video} onChange={e => setVideo(e.target.value)} placeholder="https://youtu.be/..."/></div>
      <div className="form-field"><label htmlFor="qa-notes">ملاحظات أو وصف</label><textarea id="qa-notes" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملخص المحاضرة اللي يظهر للطالب"/></div>
      <div className="form-field"><label htmlFor="qa-file">ملف PDF أو فيديو (اختياري، حتى 4 ميجا)</label><input id="qa-file" className="input" type="file" accept="application/pdf,video/mp4,video/webm" onChange={e => setFile(e.target.files?.[0] || null)}/></div>
    </>}
    {isExam && <div className="form-grid three">
      <div className="form-field"><label>النوع</label><select className="input" value={kind} onChange={e => setKind(e.target.value)}><option value="exam">امتحان</option><option value="homework">واجب</option></select></div>
      <div className="form-field"><label>المدة بالدقائق</label><input className="input" type="number" min={1} max={300} value={duration} onChange={e => setDuration(+e.target.value)}/></div>
      <div className="form-field"><label>المحاولات</label><input className="input" type="number" min={1} max={20} value={attempts} onChange={e => setAttempts(+e.target.value)}/></div>
    </div>}
    {mode === "auto" && <>
      <div className="form-field"><label>عدد الأسئلة</label><input className="input" type="number" min={1} max={60} value={count} onChange={e => setCount(+e.target.value)}/></div>
      <div className="form-field"><label>المواضيع {picked.length ? `(${picked.length} مختار)` : "(سيبها فاضية لكل المواضيع)"}</label>
        {gradeId ? (topics.length ? <div className="qa-topics">{topics.map(t => <button type="button" key={t.topic} className={`qa-topic${picked.includes(t.topic) ? " on" : ""}`} aria-pressed={picked.includes(t.topic)} onClick={() => setPicked(p => p.includes(t.topic) ? p.filter(x => x !== t.topic) : [...p, t.topic])}>{t.topic} <b>{t.n}</b></button>)}</div> : <small className="hint">جاري تحميل المواضيع...</small>) : <small className="hint">اختار الصف عشان تظهر المواضيع.</small>}
      </div>
    </>}
    {needsText && <div className="form-field"><label htmlFor="qa-text">{mode === "exam" ? "الأسئلة (سؤال لكل فقرة، سطر فاضي بين الأسئلة)" : "محاضرة في كل سطر: العنوان | رابط الفيديو | الوصف"}</label><textarea id="qa-text" className="input qa-text" dir="rtl" rows={9} value={text} onChange={e => setText(e.target.value)} placeholder={mode === "exam" ? EXAM_HINT : LEC_HINT}/></div>}
    <label className="check-row"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)}/> انشر على طول (الطلاب هيشوفوه ويوصلهم إشعار)</label>
    {msg && <div className={`message ${err ? "error" : ""}`} role="status">{!err && <CheckCircle2 size={16}/>} {msg}</div>}
    {preview && <div className="qa-preview">
      <div className="dashboard-section-head"><h3>المعاينة</h3><span className="tag">{preview.count} {mode === "lecture" || mode === "lectures" ? "محاضرة" : "سؤال"}</span></div>
      {preview.errors.map((e, i) => <div className="message error" key={i}>{e.line ? `سطر ${e.line}` : `سؤال ${e.block}`}: {e.error} <small>({e.text})</small></div>)}
      {preview.items.slice(0, 5).map((it, i) => <div className="qa-item" key={i}>{"title" in it ? <><strong>{String(it.title)}</strong><small>{it.videoUrl ? "فيديو مرفق" : "من غير فيديو"}{it.description ? ` · ${String(it.description).slice(0, 80)}` : ""}</small></> : <><strong>{String(it.q)}</strong><small>{(it.options as string[]).map((o, j) => `${j === it.correct ? "✔ " : ""}${o}`).join("  |  ")}</small></>}</div>)}
      {preview.count > 5 && <small className="hint">وفيه {preview.count - 5} كمان.</small>}
    </div>}
    <div className="form-actions">
      <button type="button" className="btn btn-outline" disabled={busy || !canPreview} onClick={() => run(true)}><Eye size={15}/> معاينة</button>
      <button type="button" className="btn btn-primary" disabled={busy || !canPreview || !preview || preview.errors.length > 0 || preview.count === 0} onClick={() => run(false)}>{busy ? "جارٍ الحفظ..." : publish ? "حفظ ونشر" : "حفظ كمسودة"}</button>
    </div>
  </section>;
}
