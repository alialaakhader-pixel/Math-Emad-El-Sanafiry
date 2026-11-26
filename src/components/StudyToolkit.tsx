"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Plus, Trash2, CalendarClock, Timer, ListChecks, NotebookPen } from "lucide-react";

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
function usePersisted<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial); const ready = useRef(false);
  useEffect(() => { try { const raw = localStorage.getItem(key); if (raw) setV(JSON.parse(raw)); } catch {} ready.current = true; }, [key]);
  useEffect(() => { if (ready.current) localStorage.setItem(key, JSON.stringify(v)); }, [key, v]);
  return [v, setV] as const;
}

export default function StudyToolkit() {
  const [minutes, setMinutes] = useState(25); const [left, setLeft] = useState(25 * 60); const [running, setRunning] = useState(false);
  const [sessions, setSessions] = usePersisted<number>("study-sessions", 0);
  const [goals, setGoals] = usePersisted<{ t: string; d: boolean }[]>("study-goals", []); const [goal, setGoal] = useState("");
  const [note, setNote] = usePersisted<string>("study-note", "");
  const [bacDate, setBacDate] = usePersisted<string>("study-bac-date", "");
  useEffect(() => { if (!running) return; const i = setInterval(() => setLeft(l => { if (l <= 1) { setRunning(false); setSessions(s => s + 1); return minutes * 60; } return l - 1; }), 1000); return () => clearInterval(i); }, [running, minutes, setSessions]);
  const days = bacDate ? Math.ceil((new Date(bacDate).getTime() - Date.now()) / 86400000) : null;
  return <div className="dashboard-list-grid">
    <section className="panel toolkit"><h2><Timer size={18}/> مؤقت التركيز (بومودورو)</h2><div className="toolkit-time">{fmt(left)}</div>
      <div className="toolkit-row"><button type="button" className="btn btn-primary" onClick={() => setRunning(!running)}>{running ? <Pause size={16}/> : <Play size={16}/>}{running ? "إيقاف مؤقت" : "ابدأ"}</button><button type="button" className="btn btn-outline" onClick={() => { setRunning(false); setLeft(minutes * 60); }}><RotateCcw size={15}/> إعادة</button></div>
      <div className="toolkit-row">{[15, 25, 45, 60].map(m => <button type="button" key={m} className={`tag ${minutes === m ? "purple" : ""}`} onClick={() => { setMinutes(m); setLeft(m * 60); setRunning(false); }}>{m} د</button>)}</div>
      <p className="small" style={{ textAlign: "center" }}>جلسات مكتملة: {sessions}</p></section>
    <section className="panel toolkit"><h2><CalendarClock size={18}/> العدّ التنازلي للامتحان</h2><label className="small" htmlFor="bac-date">تاريخ الامتحان الوطني / الجهوي</label><input id="bac-date" type="date" className="input" value={bacDate} onChange={e => setBacDate(e.target.value)}/>
      <div className="toolkit-time">{days === null ? "--" : days > 0 ? `${days} يوم` : days === 0 ? "اليوم!" : "انتهى"}</div></section>
    <section className="panel"><h2><ListChecks size={18}/> أهدافي اليومية</h2><form onSubmit={e => { e.preventDefault(); if (goal.trim()) { setGoals([...goals, { t: goal.trim().slice(0, 120), d: false }]); setGoal(""); } }} className="toolkit-row" style={{ justifyContent: "stretch" }}><input className="input" style={{ flex: 1 }} value={goal} onChange={e => setGoal(e.target.value)} placeholder="مثال: حل تمرين من درس النهايات"/><button className="btn btn-primary" aria-label="إضافة"><Plus size={16}/></button></form>
      {goals.length ? goals.map((g, i) => <div key={i} className={`goal-row ${g.d ? "done" : ""}`}><input type="checkbox" checked={g.d} onChange={() => setGoals(goals.map((x, j) => j === i ? { ...x, d: !x.d } : x))}/><span style={{ flex: 1 }}>{g.t}</span><button type="button" className="inline-action" aria-label="حذف" onClick={() => setGoals(goals.filter((_, j) => j !== i))}><Trash2 size={14}/></button></div>) : <p className="small">أضف هدفك الأول لليوم.</p>}
      {goals.length > 0 && <p className="small">أنجزت {goals.filter(g => g.d).length} من {goals.length}</p>}</section>
    <section className="panel toolkit"><h2><NotebookPen size={18}/> ملاحظاتي السريعة</h2><textarea className="input" value={note} onChange={e => setNote(e.target.value.slice(0, 5000))} placeholder="اكتب قوانين وملاحظات تحتاج مراجعتها (تُحفظ على جهازك)"/></section>
  </div>;
}
