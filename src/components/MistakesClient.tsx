"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, RefreshCw, ArrowLeft, Trophy, BookX } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

type Opt = { i: number; text: string };
type Q = { key: string; src: string; topic: string; q: string; options: Opt[] };
type Res = { correct: boolean; answer: number; why?: string; score?: number; points?: number };

export default function MistakesClient({ user }: { user: { name: string; role: string } }) {
  const [queue, setQueue] = useState<Q[] | null>(null);
  const [total, setTotal] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [fixed, setFixed] = useState(0);
  const [size, setSize] = useState(0);
  const [wrongOnce, setWrongOnce] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState<number | null>(null);
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    setQueue(null); setPick(null); setRes(null); setFixed(0); setFirstTry(0); setWrongOnce(new Set()); setErr("");
    const r = await fetch("/api/mistakes", { cache: "no-store" });
    if (!r.ok) { setErr("مقدرتش أجيب أسئلتك. جرّب تاني."); setQueue([]); return; }
    const d = await r.json(); setQueue(d.questions); setSize(d.questions.length); setTotal(d.total);
  }, []);
  useEffect(() => { load(); }, [load]);

  const cur = queue && queue.length ? queue[0] : null;
  async function answer(o: Opt) {
    if (!cur || busy || res) return;
    setBusy(true); setPick(o.i); setErr("");
    try {
      const practice = cur.key.startsWith("p:"); const qid = cur.key.slice(2);
      const r = await fetch(practice ? "/api/practice" : "/api/mistakes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qid, choice: o.i }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "حصلت مشكلة."); setPick(null); return; }
      setRes({ correct: d.correct, answer: d.answer, why: d.why });
    } catch { setErr("النت وحش. جرّب تاني."); setPick(null); } finally { setBusy(false); }
  }
  async function submitEssay() {
    if (!cur || busy || res || text.trim().length < 2) return;
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/mistakes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qid: cur.key.slice(2), answer: text }) });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "حصلت مشكلة."); return; }
      setRes({ correct: d.correct, answer: -1, why: d.feedback, score: d.score, points: d.points });
    } catch { setErr("النت وحش. جرّب تاني."); } finally { setBusy(false); }
  }
  function next() {
    setText("");
    if (!cur || !res || !queue) return;
    const rest = queue.slice(1);
    if (res.correct) { setFixed(f => f + 1); if (!wrongOnce.has(cur.key)) setFirstTry(f => f + 1); setQueue(rest); }
    else { setWrongOnce(new Set(wrongOnce).add(cur.key)); setQueue([...rest, { ...cur, options: [...cur.options].sort(() => Math.random() - 0.5) }]); }
    setPick(null); setRes(null);
  }

  return <div className="app-page"><SiteHeader user={user as never}/><main className="app-container pr-page">
    <div className="dashboard-section-head"><h1 style={{ fontSize: 22, margin: 0 }}><BookX size={20} style={{ verticalAlign: "-3px" }}/> راجع أخطائي</h1>{queue && size > 0 && <span dir="ltr" className="tag purple">{fixed} / {size}</span>}</div>
    {queue === null && <section className="panel"><p className="small">بجهّز أسئلتك...</p></section>}
    {err && !cur && <section className="panel"><p className="small">{err}</p></section>}
    {queue && !cur && !err && size === 0 && <section className="panel pr-end"><Trophy size={34}/><h2>مفيش أخطاء تراجعها</h2><p>كل اللي جاوبت عليه غلط اتصلّح أو لسه ماجاوبتش. حل امتحان أو تدرّب وارجع.</p><Link className="btn btn-primary" href="/practice">ابدأ تدريب</Link></section>}
    {queue && !cur && size > 0 && <section className="panel pr-end"><Trophy size={34}/><h2>خلصت المراجعة!</h2><p>صلّحت {fixed} من {size} سؤال، و{firstTry} منهم من أول مرة.{total > size ? ` لسه عندك ${total - size} سؤال غلط تاني.` : ""}</p><div className="form-actions" style={{ justifyContent: "center" }}>{total > size && <button className="btn btn-primary" onClick={load}><RefreshCw size={15}/> جولة تانية</button>}<Link className="btn btn-outline" href="/dashboard">رجوع للوحة</Link></div></section>}
    {cur && <section className="panel">
      <div className="pr-qtop"><span className="tag">{cur.src === "practice" ? "من التدريب" : "من امتحان"} · {cur.topic}</span><small>{wrongOnce.has(cur.key) ? "محاولة تانية" : `باقي ${queue!.length}`}</small></div>
      <p className="pr-q" dir="auto">{cur.q}</p>
      {cur.src === "essay" && !res && <><textarea className="input" rows={6} value={text} onChange={e => setText(e.target.value)} placeholder="اكتب حلك هنا بالخطوات" disabled={busy}/><button className="btn btn-primary" style={{ marginTop: 10 }} disabled={busy || text.trim().length < 2} onClick={submitEssay}>{busy ? "بصحح..." : "صحّح إجابتي"}</button></>}
      <div className="pr-opts">{cur.options.map(o => {
        const cls = res ? (o.i === res.answer ? " right" : o.i === pick ? " wrong" : "") : "";
        return <button key={o.i} className={"pr-opt" + cls} disabled={!!res || busy} onClick={() => answer(o)}><span>{o.text}</span>{res && o.i === res.answer && <Check size={18}/>}{res && !res.correct && o.i === pick && <X size={18}/>}</button>;
      })}</div>
      {err && <p className="small" style={{ color: "#f3a1aa" }}>{err}</p>}
      {res && <div className={"pr-fb " + (res.correct ? "ok" : "no")}><strong>{res.correct ? "برافو، صلّحتها!" : "لسه غلط، هتيجيلك تاني في الآخر."}{res.points ? ` (${res.score} من ${res.points})` : ""}</strong>{res.why && <p>{res.why}</p>}<button className="btn btn-primary" onClick={next}>{queue!.length === 1 && res.correct ? "إنهاء" : "التالي"} <ArrowLeft size={15}/></button></div>}
    </section>}
  </main></div>;
}
