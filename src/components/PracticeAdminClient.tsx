"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2, FileText, AlertTriangle, Check, X } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

type Grade = { id: string; title: string };
type Q = { id: string; gradeId: string | null; topic: string; q: string; options: string[]; correct: number; why: string; answers: number; right: number };
type Err = { block: number; text: string; error: string };
const LETTERS = ["أ", "ب", "ج", "د"];
const blank = { id: "", gradeId: "all", topic: "", q: "", options: ["", "", "", ""], correct: 0, why: "" };
const SAMPLE = `س: ما نهاية (x²-1)/(x-1) عندما x تؤول إلى 1؟
أ) 0
ب) 1
ج) 2
د) غير موجودة
الإجابة: ج
الشرح: نحلل البسط إلى (x-1)(x+1) ونختصر فتصبح النهاية x+1 = 2.`;
const THIN = 5;

export default function PracticeAdminClient({ teacher }: { teacher: { name: string } }) {
  const [grades, setGrades] = useState<Grade[]>([]); const [qs, setQs] = useState<Q[] | null>(null);
  const [msg, setMsg] = useState(""); const [bad, setBad] = useState(false); const [busy, setBusy] = useState(false);
  const [fg, setFg] = useState("all"); const [ft, setFt] = useState(""); const [search, setSearch] = useState("");
  const [form, setForm] = useState(blank); const [confirmQ, setConfirmQ] = useState<Q | null>(null);
  const [tab, setTab] = useState<"one" | "bulk">("one");
  const [bulk, setBulk] = useState({ text: "", gradeId: "all", topic: "" }); const [bulkErr, setBulkErr] = useState<Err[]>([]); const [bulkInfo, setBulkInfo] = useState("");
  const formRef = useRef<HTMLElement>(null);
  const say = (m: string, e = false) => { setMsg(m); setBad(e); };

  const load = useCallback(async () => {
    try { const r = await fetch("/api/admin/practice", { cache: "no-store" }); const d = await r.json(); if (!r.ok) throw new Error(d.error); setGrades(d.grades); setQs(d.questions); }
    catch (e) { say(e instanceof Error ? e.message : "تعذر تحميل الأسئلة.", true); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json(); if (!r.ok) { if (d.errors) setBulkErr(d.errors); throw new Error(d.error || "تعذر الحفظ."); }
      return d;
    } catch (e) { say(e instanceof Error ? e.message : "تعذر الاتصال بالخادم.", true); return null; } finally { setBusy(false); }
  }
  const gname = (id: string | null) => id ? grades.find(g => g.id === id)?.title || "؟" : "كل الصفوف";

  const topicsFor = useMemo(() => {
    const m = new Map<string, number>();
    (qs || []).filter(q => fg === "all" || q.gradeId === fg || (fg !== "all" && q.gradeId === null)).forEach(q => m.set(q.topic, (m.get(q.topic) || 0) + 1));
    return [...m.entries()].sort((a, b) => a[1] - b[1]);
  }, [qs, fg]);
  const shown = (qs || []).filter(q => (fg === "all" || q.gradeId === fg || q.gradeId === null) && (!ft || q.topic === ft) && (!search || (q.q + q.topic).includes(search.trim())));
  const allTopics = useMemo(() => [...new Set((qs || []).map(q => q.topic))].sort(), [qs]);
  const gradeCount = (id: string) => (qs || []).filter(q => q.gradeId === id || q.gradeId === null).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault(); say("");
    const d = await post({ action: "save", ...form, id: form.id || undefined });
    if (d) { say(d.message); setForm(blank); await load(); }
  }
  function edit(q: Q) { setForm({ id: q.id, gradeId: q.gradeId || "all", topic: q.topic, q: q.q, options: q.options, correct: q.correct, why: q.why }); setTab("one"); say(""); setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }
  async function doDelete() {
    if (!confirmQ) return; const id = confirmQ.id; setConfirmQ(null);
    const d = await post({ action: "delete", id }); if (d) { say(d.message); if (form.id === id) setForm(blank); await load(); }
  }
  async function bulkCheck(commit: boolean) {
    setBulkErr([]); setBulkInfo(""); say("");
    const d = await post({ action: "bulk", ...bulk, dryRun: !commit });
    if (!d) return;
    if (commit) { say(d.message); setBulk({ ...bulk, text: "" }); setBulkInfo(""); await load(); }
    else { setBulkErr(d.errors || []); setBulkInfo(`${d.count} سؤال سليم جاهز للإضافة${d.errors?.length ? ` و${d.errors.length} فيهم مشكلة` : ""}.`); }
  }
  const setOpt = (i: number, v: string) => setForm({ ...form, options: form.options.map((o, j) => j === i ? v : o) });

  return <div className="app-page"><SiteHeader user={{ name: teacher.name, role: "teacher" }}/><main className="app-container pa-page">
    <Link href="/admin" className="app-back"><ArrowLeft size={15}/> لوحة الإدارة</Link>
    <div className="page-head"><span className="section-kicker"><span/> إدارة التدريب</span><h1>بنك أسئلة التدريب</h1><p>أضف أسئلة أو الصق ورقة كاملة، وعدّل أو امسح. الطلاب بيشوفوا التغيير في أول جولة تدريب جاية، وكل طالب بيشوف أسئلة صفه بس.</p></div>
    {msg && <div className={`message ${bad ? "error" : ""}`} role="status">{msg}</div>}
    {!qs ? <div className="loading-block"><div className="loading-spinner"/> جارٍ التحميل...</div> : <>
      <section className="panel pa-sum"><div className="pa-grades">
        <button type="button" className={fg === "all" ? "on" : ""} onClick={() => { setFg("all"); setFt(""); }}><b>{qs.length}</b><span>كل الأسئلة</span></button>
        {grades.map(g => <button type="button" key={g.id} className={fg === g.id ? "on" : ""} onClick={() => { setFg(g.id); setFt(""); }}><b>{gradeCount(g.id)}</b><span>{g.title}</span></button>)}
      </div>
      <h3 className="pa-h">المواضيع {fg !== "all" && `· ${gname(fg)}`} <small>(الأقل أسئلة الأول)</small></h3>
      <div className="pa-topics">{topicsFor.map(([t, n]) => <button type="button" key={t} className={`pa-t ${n < THIN ? "thin" : ""} ${ft === t ? "on" : ""}`} onClick={() => setFt(ft === t ? "" : t)}>{n < THIN && <AlertTriangle size={12}/>}{t}<b>{n}</b></button>)}</div>
      <p className="small pa-note">الأحمر معناه أقل من {THIN} أسئلة في الموضوع ده: محتاج إضافة.</p></section>

      <section className="panel" ref={formRef}>
        <div className="pa-tabs"><button type="button" className={tab === "one" ? "on" : ""} onClick={() => setTab("one")}><Plus size={14}/> {form.id ? "تعديل سؤال" : "سؤال جديد"}</button><button type="button" className={tab === "bulk" ? "on" : ""} onClick={() => setTab("bulk")}><FileText size={14}/> لصق أسئلة كتير</button></div>
        {tab === "one" ? <form onSubmit={submit}>
          <div className="form-grid"><div className="form-field"><label>الصف *</label><select className="input" value={form.gradeId} onChange={e => setForm({ ...form, gradeId: e.target.value })}><option value="all">كل الصفوف</option>{grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
          <div className="form-field"><label>الموضوع *</label><input className="input" list="pa-topics" required maxLength={60} value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="مثال: النهايات"/><datalist id="pa-topics">{allTopics.map(t => <option key={t} value={t}/>)}</datalist></div></div>
          <div className="form-field"><label>نص السؤال *</label><textarea className="input pa-ta" dir="auto" required maxLength={600} value={form.q} onChange={e => setForm({ ...form, q: e.target.value })}/></div>
          <div className="form-field"><label>الاختيارات الأربعة (اضغط الدائرة على الإجابة الصحيحة) *</label>
            {form.options.map((o, i) => <div key={i} className={`pa-opt ${form.correct === i ? "ok" : ""}`}><button type="button" aria-label={`الإجابة الصحيحة ${LETTERS[i]}`} className="pa-radio" onClick={() => setForm({ ...form, correct: i })}>{form.correct === i ? <Check size={14}/> : LETTERS[i]}</button><input className="input" dir="auto" required maxLength={200} value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`الاختيار ${LETTERS[i]}`}/></div>)}</div>
          <div className="form-field"><label>الشرح اللي يظهر بعد الإجابة *</label><textarea className="input pa-ta" dir="auto" required maxLength={800} value={form.why} onChange={e => setForm({ ...form, why: e.target.value })}/></div>
          <div className="form-actions"><button className="btn btn-primary" disabled={busy}>{form.id ? "حفظ التعديل" : "إضافة السؤال"}</button>{form.id && <button type="button" className="btn btn-outline" onClick={() => setForm(blank)}>إلغاء التعديل</button>}</div>
        </form> : <div>
          <p className="small">اكتب كل سؤال في فقرة، وسيب سطر فاضي بين الأسئلة. الصف والموضوع من الخانتين تحت، أو اكتب في أول الفقرة سطر <b>الصف:</b> أو <b>الموضوع:</b> لو سؤال مختلف.</p>
          <div className="form-grid"><div className="form-field"><label>الصف الافتراضي</label><select className="input" value={bulk.gradeId} onChange={e => setBulk({ ...bulk, gradeId: e.target.value })}><option value="all">كل الصفوف</option>{grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
          <div className="form-field"><label>الموضوع الافتراضي</label><input className="input" list="pa-topics" maxLength={60} value={bulk.topic} onChange={e => setBulk({ ...bulk, topic: e.target.value })} placeholder="مثال: النهايات"/></div></div>
          <div className="form-field"><label>الأسئلة</label><textarea className="input pa-ta pa-bulk" dir="auto" value={bulk.text} onChange={e => { setBulk({ ...bulk, text: e.target.value }); setBulkInfo(""); setBulkErr([]); }} placeholder={SAMPLE}/></div>
          <button type="button" className="inline-action" onClick={() => setBulk({ ...bulk, text: SAMPLE })}>املا مثال</button>
          {bulkInfo && <div className="message info">{bulkInfo}</div>}
          {bulkErr.length > 0 && <ul className="pa-errs">{bulkErr.map((e, i) => <li key={i}><b>السؤال {e.block}</b> ({e.text}): {e.error}</li>)}</ul>}
          <div className="form-actions"><button type="button" className="btn btn-outline" disabled={busy || !bulk.text.trim()} onClick={() => bulkCheck(false)}>تحقق الأول</button><button type="button" className="btn btn-primary" disabled={busy || !bulk.text.trim()} onClick={() => bulkCheck(true)}>أضف الكل</button></div>
          <p className="small pa-note">لو في سؤال فيه مشكلة مفيش حاجة بتتضاف، صلّحه الأول. الأسئلة المكررة بتتمنع.</p>
        </div>}
      </section>

      <section className="panel"><div className="pa-listhead"><h2>الأسئلة ({shown.length})</h2><input className="input" placeholder="ابحث في نص السؤال" value={search} onChange={e => setSearch(e.target.value)}/></div>
        {ft && <button type="button" className="inline-action" onClick={() => setFt("")}>إلغاء فلتر الموضوع: {ft} <X size={12}/></button>}
        {shown.length === 0 ? <p className="small">مفيش أسئلة بالفلتر ده.</p> : shown.map(q => <div className="list-row pa-row" key={q.id}>
          <div className="list-row-main"><strong dir="auto">{q.q}</strong><small>{gname(q.gradeId)} · {q.topic} · الإجابة: {LETTERS[q.correct]}) {q.options[q.correct]}{q.answers ? ` · اتجاوب ${q.answers} مرة (${Math.round(100 * q.right / q.answers)}% صح)` : ""}</small></div>
          <div className="list-row-actions"><button type="button" className="inline-action" onClick={() => edit(q)}><Pencil size={13}/> تعديل</button><button type="button" className="inline-action danger" onClick={() => setConfirmQ(q)}><Trash2 size={13}/> مسح</button></div>
        </div>)}
      </section></>}
    {confirmQ && <div className="pa-modal" role="dialog" aria-modal="true"><div className="pa-dialog"><h3>تمسح السؤال ده؟</h3><p dir="auto">{confirmQ.q}</p><small>مش هيظهر للطلاب تاني ومينفعش تتراجع. إجابات الطلاب القديمة بتفضل في نقاطهم.</small><div className="form-actions"><button className="btn btn-outline danger" disabled={busy} onClick={doDelete}>امسح</button><button className="btn btn-outline" onClick={() => setConfirmQ(null)}>لأ، سيبه</button></div></div></div>}
  </main></div>;
}
