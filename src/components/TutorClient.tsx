"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, Volume2, Square, Bot } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

type Src = { title: string; page: number; own: boolean };
type Turn = { q: string; a: string; err?: boolean; src?: Src[]; grounded?: boolean };

// Clean a recording before upload: mono 16 kHz, trim leading/trailing silence (with padding), normalise the level without clipping, 16-bit WAV.
async function prepareAudio(pcm: Float32Array, rate: number): Promise<string | null> {
  try {
    const dec = new AudioBuffer({ length: pcm.length, numberOfChannels: 1, sampleRate: rate }); dec.copyToChannel(pcm as Float32Array<ArrayBuffer>, 0);
    const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(dec.duration * 16000)), 16000);
    const src = off.createBufferSource(); src.buffer = dec; src.connect(off.destination); src.start();
    const ch = (await off.startRendering()).getChannelData(0);
    const fr = 320; const n = Math.floor(ch.length / fr); const rms: number[] = [];
    for (let i = 0; i < n; i++) { let a = 0; for (let k = 0; k < fr; k++) { const v = ch[i * fr + k]; a += v * v; } rms.push(Math.sqrt(a / fr)); }
    const peakR = Math.max(...rms, 1e-4); const thr = Math.max(0.006, peakR * 0.12);
    let a = rms.findIndex(r => r > thr); let b = rms.length - 1 - [...rms].reverse().findIndex(r => r > thr);
    if (a < 0 || b < a) return null;
    a = Math.max(0, a - 12); b = Math.min(n - 1, b + 12); // keep ~250 ms before and ~250 ms after the speech
    const seg = ch.slice(a * fr, (b + 1) * fr); let pk = 0; for (const v of seg) pk = Math.max(pk, Math.abs(v));
    const gain = pk > 0.001 ? Math.min(12, 0.9 / pk) : 1;
    const wav = new ArrayBuffer(44 + seg.length * 2); const dv = new DataView(wav); const w = (o: number, t: string) => { for (let i = 0; i < t.length; i++) dv.setUint8(o + i, t.charCodeAt(i)); };
    w(0, "RIFF"); dv.setUint32(4, 36 + seg.length * 2, true); w(8, "WAVEfmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 16000, true); dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, seg.length * 2, true);
    for (let i = 0; i < seg.length; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, seg[i] * gain)) * 32767, true);
    const u8 = new Uint8Array(wav); let bin = ""; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return btoa(bin);
  } catch { return null; }
}
function pickVoice(): SpeechSynthesisVoice | undefined {
  const vs = window.speechSynthesis?.getVoices() || [];
  const score = (v: SpeechSynthesisVoice) => (v.lang.replace("_", "-").toLowerCase() === "ar-eg" ? 10 : v.lang.toLowerCase().startsWith("ar") ? 5 : 0) + (/natural|online|neural|enhanced|premium/i.test(v.name) ? 3 : 0) + (/google|microsoft|siri/i.test(v.name) ? 1 : 0);
  return vs.filter(v => score(v) >= 5).sort((x, y) => score(y) - score(x))[0];
}
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
      const r = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, tutor: true, history: turnsRef.current.filter(t => !t.err).slice(-4).map(t => ({ q: t.q, a: t.a })) }) });
      const d = await r.json();
      setTurns(t => [...t, r.ok ? { q: question, a: d.answer, src: d.sources, grounded: d.grounded } : { q: question, a: d.error || "تعذر الحصول على إجابة الآن.", err: true }]);
    } catch { setTurns(t => [...t, { q: question, a: "تعذر الاتصال بالخادم.", err: true }]); }
    setBusy(false);
  }
  function speak(i: number) {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) { setNote("متصفحك لا يدعم القراءة بالصوت."); return; }
    if (speaking === i) { synth.cancel(); setSpeaking(-1); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean(turns[i].a)); u.rate = 0.95;
    const v = pickVoice(); u.lang = v?.lang || "ar-SA"; if (v) u.voice = v; else setNote("لا يوجد صوت عربي في جهازك، فقد تسمع نطقاً غير دقيق. ثبّت صوتاً عربياً من إعدادات الهاتف (الصوت / اللغة).");
    u.onend = () => setSpeaking(-1); u.onerror = () => setSpeaking(-1);
    setSpeaking(i); synth.speak(u);
  }
  // ---- Conversation mode: tap once, talk, hear the answer, mic reopens by itself. Records only while speech is detected, so nothing is sent or billed while idle.
  const [conv, setConv] = useState(false); const [phase, setPhase] = useState<"listening" | "thinking" | "speaking">("listening"); const [level, setLevel] = useState(0);
  const R = useRef({ on: false, phase: "listening" as "listening" | "thinking" | "speaking", stream: null as MediaStream | null, ctx: null as AudioContext | null, timer: 0 as unknown as ReturnType<typeof setInterval>, rec: false, chunks: [] as Float32Array[], ring: [] as Float32Array[], ringLen: 0, rate: 48000, node: null as ScriptProcessorNode | null, loud: 0, voiced: 0, lastVoice: 0, startAt: 0, idleSince: 0, token: 0, abort: null as AbortController | null });
  const turnsRef = useRef<Turn[]>([]); useEffect(() => { turnsRef.current = turns; }, [turns]);
  const setPh = (p: "listening" | "thinking" | "speaking") => { R.current.phase = p; setPhase(p); };
  async function askText(text: string, signal?: AbortSignal): Promise<string | null> {
    const question = text.trim(); if (question.length < 3) return null;
    try {
      const history = turnsRef.current.filter(t => !t.err).slice(-4).map(t => ({ q: t.q, a: t.a }));
      const r = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, tutor: true, history }), signal });
      const d = await r.json();
      if (r.ok) { setTurns(t => [...t, { q: question, a: d.answer, src: d.sources, grounded: d.grounded }]); return d.answer as string; }
      setTurns(t => [...t, { q: question, a: d.error || "تعذر الحصول على إجابة الآن.", err: true }]); return null;
    } catch (e) { if ((e as Error)?.name === "AbortError") return null; setTurns(t => [...t, { q: question, a: "تعذر الاتصال بالخادم.", err: true }]); return null; }
  }
  function speakChunks(text: string, token: number, done: () => void) {
    const synth = window.speechSynthesis; if (!synth) { done(); return; }
    synth.cancel();
    const parts = clean(text).split(/(?<=[.؟!?\n])\s*/).flatMap(x => x.length > 180 ? x.match(/.{1,180}(\s|$)/g) || [x] : [x]).map(x => x.trim()).filter(Boolean);
    const v = pickVoice(); if (!v) setNote("لا يوجد صوت عربي في جهازك، فقد تسمع نطقاً غير دقيق. ثبّت صوتاً عربياً من إعدادات الهاتف (الصوت / اللغة)."); else if (!v.lang.toLowerCase().startsWith("ar-eg")) setNote("الصوت العربي المتاح على جهازك ليس مصرياً، وده أفضل صوت عربي موجود عندك.");
    let i = 0;
    const next = () => { if (token !== R.current.token) return; if (i >= parts.length) { done(); return; } const u = new SpeechSynthesisUtterance(parts[i++]); u.lang = v?.lang || "ar-SA"; u.rate = 0.95; if (v) u.voice = v; u.onend = next; u.onerror = () => { if (token === R.current.token) done(); }; synth.speak(u); };
    next();
  }
  async function processPcm(pcm: Float32Array, rate: number) {
    const c = R.current; setPh("thinking"); c.abort = new AbortController();
    try {
      const audio = await prepareAudio(pcm, rate);
      if (!audio) { setNote("ما سمعتش كويس، جرّب تاني."); setPh("listening"); c.idleSince = Date.now(); return; }
      const r = await fetch("/api/tutor/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audio }), signal: c.abort.signal });
      const d = await r.json().catch(() => ({}));
      if (!c.on) return;
      if (!r.ok || !d.text) { if (r.status === 429 || r.status === 503) { setNote(d?.error || "الصوت غير متاح الآن."); stopConv(); return; } setNote(d?.error || "ما سمعتش كويس، جرّب تاني."); setPh("listening"); c.idleSince = Date.now(); return; }
      setNote("");
      const answer = await askText(d.text, c.abort.signal);
      if (!c.on) return;
      if (!answer) { setPh("listening"); c.idleSince = Date.now(); return; }
      const token = ++c.token; setPh("speaking");
      speakChunks(answer, token, () => { if (c.on && token === c.token) { setPh("listening"); c.idleSince = Date.now(); } });
    } catch { if (c.on) { setPh("listening"); c.idleSince = Date.now(); } }
  }
  function startRec() {
    const c = R.current; if (!c.stream || c.rec) return;
    c.chunks = [...c.ring]; c.voiced = 0; c.startAt = Date.now(); c.lastVoice = Date.now(); c.rec = true; // the last ~0.7 s before the voice was detected is kept, so the first syllable is not cut
  }
  function endRec() {
    const c = R.current; if (!c.rec) return; c.rec = false;
    const dur = Date.now() - c.startAt; const parts = c.chunks; c.chunks = [];
    if (!c.on) return;
    if (c.voiced < 4 || dur < 600) { setPh("listening"); return; }
    let len = 0; for (const x of parts) len += x.length; const pcm = new Float32Array(len); let o = 0; for (const x of parts) { pcm.set(x, o); o += x.length; }
    void processPcm(pcm, c.rate);
  }
  function tick() {
    const c = R.current; if (!c.on || !c.ctx) return;
    const an = (c as unknown as { an: AnalyserNode }).an; const data = new Uint8Array(an.fftSize); an.getByteTimeDomainData(data);
    let sum = 0; for (const x of data) { const d = (x - 128) / 128; sum += d * d; } const rms = Math.sqrt(sum / data.length); setLevel(Math.min(1, rms * 8));
    const cn = c as unknown as { nf?: number }; const nf = cn.nf ?? 0.01; if (!c.rec && rms < nf * 2.5 + 0.01) cn.nf = Math.min(0.006, nf * 0.95 + rms * 0.05); // adapts to room noise
    const thr = c.phase === "speaking" ? 0.14 : Math.max(0.015, nf * 4); const now = Date.now(); const voice = rms > thr;
    if (c.rec) {
      if (voice) { c.lastVoice = now; c.voiced++; }
      if (now - c.lastVoice > 1700 || now - c.startAt > 30000) endRec();
      return;
    }
    if (c.phase === "thinking") return;
    c.loud = voice ? c.loud + 1 : 0;
    if (c.loud >= (c.phase === "speaking" ? 5 : 2)) {
      c.loud = 0;
      if (c.phase === "speaking") { c.token++; try { window.speechSynthesis.cancel(); } catch { /* none */ } }
      setPh("listening"); startRec();
    } else if (c.phase === "listening" && now - c.idleSince > 90000) { setNote("وقفت المحادثة لأنك ساكت من فترة. اضغط الميكروفون للبدء من جديد."); stopConv(); }
  }
  function stopConv() {
    const c = R.current; c.on = false; c.token++; clearInterval(c.timer); c.abort?.abort();
    c.rec = false; c.chunks = []; c.ring = []; c.ringLen = 0; try { c.node?.disconnect(); if (c.node) c.node.onaudioprocess = null; } catch { /* none */ } c.node = null; c.stream?.getTracks().forEach(t => t.stop()); c.stream = null; void c.ctx?.close().catch(() => null); c.ctx = null;
    try { window.speechSynthesis?.cancel(); } catch { /* none */ }
    setConv(false); setLevel(0); setPh("listening");
  }
  async function startConv() {
    if (!voiceEnabled || R.current.on) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false, channelCount: 1 } });
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx(); const src = ctx.createMediaStreamSource(stream); const an = ctx.createAnalyser(); an.fftSize = 1024; src.connect(an);
      const node = ctx.createScriptProcessor(2048, 1, 1); const mute = ctx.createGain(); mute.gain.value = 0; src.connect(node); node.connect(mute); mute.connect(ctx.destination);
      node.onaudioprocess = e => { const x = new Float32Array(e.inputBuffer.getChannelData(0)); const cc = R.current; if (cc.rec) { cc.chunks.push(x); return; } cc.ring.push(x); cc.ringLen += x.length; while (cc.ringLen - cc.ring[0].length > cc.rate * 0.7) { cc.ringLen -= cc.ring[0].length; cc.ring.shift(); } };
      const c = R.current as unknown as Record<string, unknown>; c.an = an; c.stream = stream; c.ctx = ctx; c.on = true; c.idleSince = Date.now(); c.rate = ctx.sampleRate; c.node = node; c.ring = []; c.ringLen = 0; c.rec = false;
      setNote(""); setConv(true); setPh("listening"); window.speechSynthesis?.getVoices();
      R.current.timer = setInterval(tick, 50);
    } catch { setNote("اسمح للمتصفح باستخدام الميكروفون."); }
  }
  useEffect(() => { const stop = () => { if (R.current.on) stopConv(); }; const vis = () => { if (document.hidden) stop(); }; window.addEventListener("pagehide", stop); document.addEventListener("visibilitychange", vis); return () => { window.removeEventListener("pagehide", stop); document.removeEventListener("visibilitychange", vis); stop(); }; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const phaseLabel = { listening: "بسمعك... اتكلم", thinking: "بفكّر في إجابتك...", speaking: "بتكلّمك الآن (اتكلم لو عايز تقاطعني)" }[phase];

  return <div className="app-page"><SiteHeader user={user as never}/><main className="app-container tutor-page">
    <div className="page-head"><span className="section-kicker"><span/> مدرّسك الخاص</span><h1>المعلم الذكي</h1><p>اسأل في الرياضيات واسمع الشرح خطوة بخطوة، ويظهر مكتوباً كمان.</p></div>
    <section className="tutor-chat" aria-live="polite">
      {turns.length === 0 && <div className="panel live-empty"><Bot size={32}/><h3>اسألني أي سؤال في الرياضيات</h3><p>مثال: اشرح لي قانون المشتقة، أو كيف أحل معادلة من الدرجة الثانية؟</p></div>}
      {turns.map((t, i) => <div key={i} className="tutor-turn">
        <div className="tutor-q">{t.q}</div>
        <div className={`tutor-a${t.err ? " err" : ""}`}><p>{t.a}</p>{t.grounded && t.src?.length ? <p className="small tutor-src">من مكتبة المنصة: {[...new Map(t.src.map(x => [x.title + x.page, x])).values()].map(x => `${x.title} (${x.own ? "فقرة" : "ص"} ${x.page})`).join(" • ")}</p> : null}{!t.err && <button type="button" className="btn btn-outline tutor-listen" onClick={() => speak(i)}>{speaking === i ? <><Square size={14}/> إيقاف</> : <><Volume2 size={16}/> استمع للشرح</>}</button>}</div>
      </div>)}
      {busy && <div className="tutor-a"><p className="small">المعلم الذكي بيجهز الشرح...</p></div>}
      <div ref={endRef}/>
    </section>
    {conv && <div className={`tutor-conv ${phase}`} role="status"><span className="tutor-orb" style={{ transform: `scale(${1 + level * 0.6})` }}/><b>{phaseLabel}</b><button type="button" className="btn btn-outline" onClick={stopConv}><Square size={14}/> إيقاف المحادثة</button></div>}
    {note && <p className="live-warn">{note}</p>}
    <form className="tutor-bar" onSubmit={e => { e.preventDefault(); void ask(q); }}>
      <button type="button" className={`tutor-mic${conv ? " on" : ""}${voiceEnabled ? "" : " off"}`} onClick={() => conv ? stopConv() : void startConv()} aria-label={conv ? "إيقاف المحادثة" : "ابدأ محادثة صوتية"} title={voiceEnabled ? "محادثة صوتية" : "لسه مش متفعّل"}>{conv ? <Square size={18}/> : <Mic size={20}/>}</button>
      <input className="input" value={q} maxLength={600} onChange={e => setQ(e.target.value)} placeholder="اكتب سؤالك في الرياضيات..."/>
      <button type="submit" className="btn btn-primary" disabled={busy || q.trim().length < 3} aria-label="إرسال"><Send size={18}/></button>
    </form>
    {!voiceEnabled ? <p className="small tutor-soon">المحادثة بالصوت (الميكروفون): لسه مش متفعّلة، بتشتغل أول ما يتم تحديث خدمة Ellool AI. تقدر تكتب سؤالك وتسمع الإجابة.</p> : !conv && <p className="small tutor-soon">اضغط الميكروفون مرة واحدة وابدأ كلامك، وهيرد عليك بالصوت ويفضل سامعك للسؤال اللي بعده.</p>}
  </main></div>;
}
