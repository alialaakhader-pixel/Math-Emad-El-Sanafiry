"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Volume2, Square, Bot } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

type Turn = { q: string; a: string; err?: boolean };
const clean = (t: string) => t.replace(/[*#`_>|]/g, "").replace(/\n{2,}/g, "\n");

export default function TutorClient({ user, voiceEnabled }: { user: { name: string; role: string }; voiceEnabled: boolean }) {
  const [q, setQ] = useState(""); const [turns, setTurns] = useState<Turn[]>([]); const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(-1); const [note, setNote] = useState("");
  const [rec, setRec] = useState(false); const mr = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, busy]);
  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch { /* none */ } }, []);

  async function ask(text: string) {
    const question = text.trim(); if (question.length < 3 || busy) return;
    setBusy(true); setQ(""); setNote("");
    try {
      const r = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, tutor: true }) });
      const d = await r.json();
      setTurns(t => [...t, r.ok ? { q: question, a: d.answer } : { q: question, a: d.error || "تعذر الحصول على إجابة الآن.", err: true }]);
    } catch { setTurns(t => [...t, { q: question, a: "تعذر الاتصال بالخادم.", err: true }]); }
    setBusy(false);
  }
  function speak(i: number) {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) { setNote("متصفحك لا يدعم القراءة بالصوت."); return; }
    if (speaking === i) { synth.cancel(); setSpeaking(-1); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean(turns[i].a)); u.lang = "ar-SA"; u.rate = 0.95;
    const v = synth.getVoices().find(x => x.lang.toLowerCase().startsWith("ar")); if (v) u.voice = v; else setNote("لا يوجد صوت عربي في جهازك، فقد تسمع نطقاً غير دقيق.");
    u.onend = () => setSpeaking(-1); u.onerror = () => setSpeaking(-1);
    setSpeaking(i); synth.speak(u);
  }
  async function toggleMic() {
    if (!voiceEnabled) return;
    if (rec) { mr.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const m = new MediaRecorder(stream); chunks.current = [];
      m.ondataavailable = e => chunks.current.push(e.data);
      m.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); setRec(false);
        const blob = new Blob(chunks.current, { type: m.mimeType });
        const buf = new Uint8Array(await blob.arrayBuffer()); let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        const r = await fetch("/api/tutor/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio: btoa(bin) }) }).catch(() => null);
        const d = await r?.json().catch(() => ({}));
        if (r?.ok && d.text) void ask(d.text); else setNote(d?.error || "تعذر فهم التسجيل.");
      };
      mr.current = m; m.start(); setRec(true); setTimeout(() => { if (m.state === "recording") m.stop(); }, 30000);
    } catch { setNote("اسمح للمتصفح باستخدام الميكروفون."); }
  }

  return <div className="app-page"><SiteHeader user={user as never}/><main className="app-container tutor-page">
    <div className="page-head"><span className="section-kicker"><span/> مدرّسك الخاص</span><h1>المعلم الذكي</h1><p>اسأل في الرياضيات واسمع الشرح خطوة بخطوة، ويظهر مكتوباً كمان.</p></div>
    <section className="tutor-chat" aria-live="polite">
      {turns.length === 0 && <div className="panel live-empty"><Bot size={32}/><h3>اسألني أي سؤال في الرياضيات</h3><p>مثال: اشرح لي قانون المشتقة، أو كيف أحل معادلة من الدرجة الثانية؟</p></div>}
      {turns.map((t, i) => <div key={i} className="tutor-turn">
        <div className="tutor-q">{t.q}</div>
        <div className={`tutor-a${t.err ? " err" : ""}`}><p>{t.a}</p>{!t.err && <button type="button" className="btn btn-outline tutor-listen" onClick={() => speak(i)}>{speaking === i ? <><Square size={14}/> إيقاف</> : <><Volume2 size={16}/> استمع للشرح</>}</button>}</div>
      </div>)}
      {busy && <div className="tutor-a"><p className="small">المعلم الذكي بيجهز الشرح...</p></div>}
      <div ref={endRef}/>
    </section>
    {note && <p className="live-warn">{note}</p>}
    <form className="tutor-bar" onSubmit={e => { e.preventDefault(); void ask(q); }}>
      <button type="button" className={`tutor-mic${rec ? " on" : ""}${voiceEnabled ? "" : " off"}`} onClick={toggleMic} aria-label="سؤال بالصوت" title={voiceEnabled ? "اضغط وتكلم، واضغط تاني للإرسال" : "لسه مش متفعّل"}><Mic size={20}/></button>
      <input className="input" value={q} maxLength={600} onChange={e => setQ(e.target.value)} placeholder="اكتب سؤالك في الرياضيات..."/>
      <button type="submit" className="btn btn-primary" disabled={busy || q.trim().length < 3} aria-label="إرسال"><Send size={18}/></button>
    </form>
    {!voiceEnabled && <p className="small tutor-soon">السؤال بالصوت (الميكروفون): لسه مش متفعّل، بيتفعّل أول ما يتم تحديث خدمة Ellool AI. تقدر تكتب سؤالك وتسمع الإجابة.</p>}
  </main></div>;
}
