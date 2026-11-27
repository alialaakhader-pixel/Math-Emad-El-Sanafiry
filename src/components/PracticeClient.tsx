"use client";
import { useCallback, useEffect, useState } from "react";
import { Flame, Zap, Target, Check, X, Share2, RefreshCw, ArrowLeft, BookX, Trophy } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

type Opt = { i: number; text: string };
type Q = { id: string; topic: string; q: string; missed: boolean; fresh: boolean; options: Opt[] };
type Stats = { xp: number; level: number; from: number; to: number; streak: number; best: number; doneToday: boolean; todayAnswers: number; todayCorrect: number; goal: number; dayXp: number; cap: number; parentToken: string | null };
type Topic = { topic: string; n: number; ok: number; pct: number };
type Res = { correct: boolean; answer: number; why: string; gain: number; xp: number; level: number; levelUp: boolean; streak: number; streakUp: boolean };

export function StatsStrip({ s }: { s: Stats }) {
  const pct = Math.min(100, Math.round(100 * (s.xp - s.from) / Math.max(1, s.to - s.from)));
  return <div className="pr-strip">
    <div className="pr-chip pr-lv"><b>{s.level}</b><span>المستوى</span></div>
    <div className="pr-xpbox"><div className="pr-xprow"><span><Zap size={14}/> {s.xp} نقطة</span><small>{s.to - s.xp} للمستوى التالي</small></div><div className="pr-bar"><i style={{ width: pct + "%" }}/></div></div>
    <div className={"pr-chip " + (s.streak ? "pr-fire" : "")}><Flame size={17}/><b>{s.streak}</b><span>يوم متتالي</span></div>
  </div>;
}

export default function PracticeClient({ user }: { user: { name: string; role: string } }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [weak, setWeak] = useState<Topic | null>(null);
  const [round, setRound] = useState<Q[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [res, setRes] = useState<Res | null>(null);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(0);
  const [gained, setGained] = useState(0);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/practice/stats", { cache: "no-store" });
    if (r.ok) { const j = await r.json(); setStats(j.stats); setTopics(j.topics); setWeak(j.weak); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function start(topic?: string) {
    setErr(""); setDone(false); setScore(0); setGained(0); setIdx(0); setPick(null); setRes(null);
    const r = await fetch("/api/practice" + (topic ? "?topic=" + encodeURIComponent(topic) : ""), { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "تعذر تحميل الأسئلة."); return; }
    if (!j.questions.length) { setErr("لا توجد أسئلة لمرحلتك بعد."); return; }
    setRound(j.questions);
  }
  async function answer(o: Opt) {
    if (!round || busy || res) return;
    setBusy(true); setPick(o.i);
    const r = await fetch("/api/practice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qid: round[idx].id, choice: o.i }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || "حدث خطأ."); setPick(null); return; }
    setRes(j); if (j.correct) setScore(s => s + 1); setGained(g => g + j.gain);
  }
  function next() {
    if (!round) return;
    if (idx + 1 >= round.length) { setDone(true); load(); return; }
    setIdx(idx + 1); setPick(null); setRes(null);
  }
  async function parentLink(regen = false) {
    const r = await fetch("/api/practice/parent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regenerate: regen }) });
    const j = await r.json(); if (j.token) { await load(); return location.origin + "/parent/" + j.token; } return "";
  }
  async function share(kind: "copy" | "wa", regen = false) {
    const url = await parentLink(regen); if (!url) return;
    if (kind === "wa") { window.open("https://wa.me/?text=" + encodeURIComponent("تقرير تقدّم " + user.name + " على منصة مستر عماد السنافيري:\n" + url), "_blank"); }
    else { try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ } setCopied(regen ? "تم إنشاء رابط جديد وإلغاء القديم، ونُسخ الرابط." : "تم نسخ الرابط."); setTimeout(() => setCopied(""), 3500); }
  }

  const q = round?.[idx];
  return <div className="app-page"><SiteHeader user={user as never}/><main className="app-container pr-page">
    <div className="page-head"><div className="section-kicker"><span/>تدرّب</div><h1>تدريب يومي بخطوات صغيرة</h1><p>٥ أسئلة في كل جولة، وتصحيح فوري مع شرح. أخطاؤك ترجع لك أولاً لحد ما تثبّتها.</p></div>
    {stats && <StatsStrip s={stats}/>}
    {err && <div className="message error">{err}</div>}

    {!round && stats && <>
      <div className="panel pr-goal">
        <div className="pr-goalhead"><Target size={18}/><strong>هدف اليوم</strong><span className={"tag " + (stats.doneToday ? "success" : "purple")}>{stats.doneToday ? "تم، الاستمرارية محفوظة" : `${Math.min(stats.todayAnswers, stats.goal)} / ${stats.goal} أسئلة`}</span></div>
        <div className="pr-bar"><i style={{ width: Math.min(100, 100 * stats.todayAnswers / stats.goal) + "%" }}/></div>
        <p className="small muted">أجب على {stats.goal} أسئلة في اليوم لتحافظ على سلسلة أيامك. الحد الأقصى للنقاط اليومية {stats.cap}.</p>
        <div className="form-actions"><button className="btn btn-primary btn-large" onClick={() => start()}>ابدأ جولة جديدة <ArrowLeft size={16}/></button></div>
      </div>
      {weak && weak.pct < 70 && <div className="panel pr-next"><strong>التالي لك</strong><p>أضعف موضوع عندك الآن: <b>{weak.topic}</b> ({weak.pct}% صح). جولة قصيرة عليه ترفع مستواك.</p><button className="btn btn-ghost" onClick={() => start(weak.topic)}>تدرّب على {weak.topic}</button></div>}
      {topics.length > 0 && <div className="panel"><h2>مستواك في كل موضوع</h2>{topics.map(t => <div key={t.topic} className="pr-topic"><span>{t.topic}</span><div className="pr-bar thin"><i className={t.pct >= 70 ? "ok" : t.pct >= 40 ? "mid" : "low"} style={{ width: t.pct + "%" }}/></div><small>{t.pct}%</small></div>)}</div>}
      <div className="panel pr-parent"><h2>تقرير لولي الأمر</h2><p className="small">رابط للقراءة فقط يعرض مستواك ونشاطك ونتائجك. لا يظهر فيه بريدك ولا رقمك، وتقدر تلغيه في أي وقت.</p>
        <div className="form-actions"><button className="btn btn-ghost" onClick={() => share("wa")}><Share2 size={15}/> أرسله واتساب</button><button className="btn btn-ghost" onClick={() => share("copy")}>نسخ الرابط</button>{stats.parentToken && <button className="inline-action danger" onClick={() => share("copy", true)}><RefreshCw size={13}/> رابط جديد وإلغاء القديم</button>}</div>
        {copied && <div className="message info">{copied}</div>}
      </div>
    </>}

    {round && q && !done && <div className="panel pr-card">
      <div className="pr-qtop"><span className="tag purple">{q.topic}</span>{q.missed && <span className="tag warn"><BookX size={12}/> من دفتر أخطائك</span>}<small>{idx + 1} / {round.length}</small></div>
      <div className="pr-bar thin"><i style={{ width: (100 * idx / round.length) + "%" }}/></div>
      <h2 className="pr-q" dir="auto">{q.q}</h2>
      <div className="pr-opts">{q.options.map(o => {
        const st = res ? (o.i === res.answer ? "right" : o.i === pick ? "wrong" : "") : "";
        return <button key={o.i} disabled={!!res || busy} className={"pr-opt " + st} onClick={() => answer(o)}><span dir="auto">{o.text}</span>{st === "right" && <Check size={18}/>}{st === "wrong" && <X size={18}/>}</button>;
      })}</div>
      {res && <div className={"pr-fb " + (res.correct ? "ok" : "no")}>
        <strong>{res.correct ? "إجابة صحيحة" : "مش دقيق"}{res.gain > 0 && <em> +{res.gain} نقطة</em>}</strong>
        <p dir="auto">{res.why}</p>
        {res.levelUp && <p className="pr-up"><Trophy size={15}/> ترقّيت للمستوى {res.level}</p>}
        {res.streakUp && <p className="pr-up"><Flame size={15}/> سلسلتك أصبحت {res.streak} يوم</p>}
        <button className="btn btn-primary" onClick={next}>{idx + 1 >= round.length ? "شوف النتيجة" : "السؤال التالي"}</button>
      </div>}
    </div>}

    {round && done && <div className="panel pr-card pr-end">
      <Trophy size={34}/><h2>خلصت الجولة: {score} من {round.length}</h2><p>جمعت <b>{gained}</b> نقطة في هذه الجولة.{score < round.length ? " الأسئلة اللي غلطت فيها هتظهر لك في الجولة القادمة." : " ممتاز، كلها صح."}</p>
      <div className="form-actions" style={{ justifyContent: "center" }}><button className="btn btn-primary" onClick={() => start()}>جولة أخرى</button><button className="btn btn-ghost" onClick={() => { setRound(null); setDone(false); load(); }}>رجوع</button></div>
    </div>}
  </main></div>;
}
