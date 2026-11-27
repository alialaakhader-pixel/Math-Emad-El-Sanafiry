"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Flame, Zap, ArrowLeft } from "lucide-react";

type S = { stats: { xp: number; level: number; from: number; to: number; streak: number; doneToday: boolean; todayAnswers: number; goal: number }; weak: { topic: string; pct: number } | null };
export default function PracticeWidget() {
  const [d, setD] = useState<S | null>(null);
  useEffect(() => { fetch("/api/practice/stats", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(setD).catch(() => {}); }, []);
  if (!d) return null;
  const s = d.stats; const pct = Math.min(100, Math.round(100 * (s.xp - s.from) / Math.max(1, s.to - s.from)));
  return <Link href="/practice" className="panel pr-widget">
    <div className="pr-wtop"><strong>تدريب اليوم</strong><span className={"tag " + (s.doneToday ? "success" : "purple")}>{s.doneToday ? "تم هدف اليوم" : `${Math.min(s.todayAnswers, s.goal)} / ${s.goal}`}</span></div>
    <div className="pr-wrow"><span><b>{s.level}</b> المستوى</span><span><Zap size={13}/> {s.xp}</span><span className={s.streak ? "pr-hot" : ""}><Flame size={14}/> {s.streak} يوم</span></div>
    <div className="pr-bar"><i style={{ width: pct + "%" }}/></div>
    <small>{d.weak && d.weak.pct < 70 ? `التالي لك: ${d.weak.topic}` : "ابدأ جولة من ٥ أسئلة"} <ArrowLeft size={12}/></small>
  </Link>;
}
