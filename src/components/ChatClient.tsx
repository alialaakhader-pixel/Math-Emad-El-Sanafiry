"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, X, Flag, Send, Trash2, ShieldCheck } from "lucide-react";

type M = { img?: boolean; sid: string; id: string; body: string; at: string; mine: boolean; name: string; grade: string | null; flags?: number; iFlagged: boolean };
type Grade = { id: string; title: string };
const COLORS = ["#7ee0c3", "#f2a65a", "#7fb5ff", "#e58fd0", "#e8d36a", "#a99bff", "#ff8a8a", "#6fd3e8"];
const colorOf = (sid: string) => COLORS[parseInt(sid.slice(0, 4), 16) % COLORS.length];
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
const dayLabel = (iso: string) => { const k = dayKey(iso), today = dayKey(new Date().toISOString()), y = dayKey(new Date(Date.now() - 86400000).toISOString()); return k === today ? "اليوم" : k === y ? "أمس" : new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }); };
const t = (iso: string) => new Date(iso).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });

export default function ChatClient({ teacher = false, grades = [] }: { teacher?: boolean; grades?: Grade[] }) {
  const [msgs, setMsgs] = useState<M[]>([]); const [grade, setGrade] = useState<string | null>(null);
  const [needGrade, setNeedGrade] = useState(false); const [text, setText] = useState(""); const [err, setErr] = useState(""); const [info, setInfo] = useState("");
  const [gid, setGid] = useState(grades[0]?.id || ""); const [flagged, setFlagged] = useState(false); const [flaggedTotal, setFlaggedTotal] = useState(0);
  const [loaded, setLoaded] = useState(false); const [photo, setPhoto] = useState<string | null>(null); const [zoom, setZoom] = useState<string | null>(null); const [sending, setSending] = useState(false); const fileRef = useRef<HTMLInputElement>(null); const [sel, setSel] = useState<string | null>(null); const press = useRef<ReturnType<typeof setTimeout> | null>(null); const first = useRef(true);
  const end = useRef<HTMLDivElement>(null); const box = useRef<HTMLDivElement>(null); const stick = useRef(true);
  const load = useCallback(async () => {
    const q = teacher ? `?gradeId=${gid}${flagged ? "&flagged=1" : ""}` : "";
    const d = await fetch("/api/chat" + q, { cache: "no-store" }).then(r => r.json()).catch(() => null);
    if (!d) return; setMsgs(d.messages || []); setGrade(d.grade); setNeedGrade(!!d.needGrade); setFlaggedTotal(d.flaggedTotal || 0); setLoaded(true);
  }, [teacher, gid, flagged]);
  useEffect(() => { setLoaded(false); load(); const i = setInterval(() => { if (document.visibilityState === "visible") load(); }, 4000); return () => clearInterval(i); }, [load]);
  useEffect(() => { if (stick.current && box.current) { box.current.scrollTo({ top: box.current.scrollHeight, behavior: first.current ? "auto" : "smooth" }); if (msgs.length) first.current = false; } }, [msgs]);
  const post = (b: object) => fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(async r => ({ ok: r.ok, d: await r.json() }));
  function pick(f?: File) {
    if (!f || !/^image\/(jpeg|png|webp)$/.test(f.type)) { setErr("صور بس (JPG أو PNG)."); return; }
    const img = new Image(); const u = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height)); const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const x = c.getContext("2d")!; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      let q = 0.75, d = c.toDataURL("image/jpeg", q); while (d.length > 900000 && q > 0.35) { q -= 0.1; d = c.toDataURL("image/jpeg", q); }
      setErr(""); setPhoto(d);
    };
    img.onerror = () => setErr("مقدرتش أقرا الصورة."); img.src = u;
  }
  async function send(e: React.FormEvent) {
    e.preventDefault(); if ((!text.trim() && !photo) || sending) return; setErr(""); setSending(true);
    const { ok, d } = await post({ text, image: photo }); setSending(false);
    if (!ok) { setErr(d.error || "فشل الإرسال."); return; }
    setText(""); setPhoto(null); stick.current = true; load();
  }
  async function flag(id: string) { const { d } = await post({ action: "flag", id }); setInfo(d.message || d.error || ""); setMsgs(x => x.map(m => m.id === id ? { ...m, iFlagged: true } : m)); }
  async function del(id: string) { if (!confirm("تحذف الرسالة دي؟")) return; await post({ action: "delete", id }); load(); }
  async function clear(id: string) { await post({ action: "clearFlags", id }); load(); }
  if (!teacher && needGrade) return <div className="panel empty-state"><h3>اختار صفك الأول</h3><p>الشات متاح لطلاب صفك بس.</p><a className="btn btn-primary" href="/welcome">اختار صفك</a></div>;
  return <div className="chat-shell">
    {teacher && <div className="form-actions" style={{ marginBottom: 12 }}>
      <select className="input" style={{ maxWidth: 240 }} value={gid} onChange={e => setGid(e.target.value)}>{grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select>
      <button className={`btn ${flagged ? "btn-primary" : "btn-outline"}`} onClick={() => setFlagged(!flagged)}><Flag size={14}/> المبلّغ عنها ({flaggedTotal})</button>
    </div>}
    <div className="chat-head"><strong>{flagged && teacher ? "كل الرسائل المبلّغ عنها" : `شات ${grade || ""}`}</strong>{teacher ? <span className="tag purple"><ShieldCheck size={12}/> مراقبة</span> : <span className="tag">المدرس بيشوف الشات</span>}</div>
    <div className="chat-list" ref={box} onScroll={e => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {loaded && !msgs.length && <p className="bell-empty">{flagged ? "مفيش رسائل مبلّغ عنها." : "الشات فاضي. ابدأ إنت الكلام!"}</p>}
      {msgs.map((m, i) => {
        const prev = msgs[i - 1]; const newDay = !prev || dayKey(prev.at) !== dayKey(m.at);
        const head = newDay || prev.sid !== m.sid || (new Date(m.at).getTime() - new Date(prev.at).getTime()) > 5 * 60000;
        const open = sel === m.id; const canFlag = !teacher && !m.mine;
        return <div key={m.id} className="chat-row">
          {newDay && <div className="chat-day"><span>{dayLabel(m.at)}</span></div>}
          <div className={`chat-msg ${m.mine ? "mine" : "theirs"} ${head ? "head" : ""} ${m.flags ? "flagged" : ""}`}
            onClick={() => { if (canFlag) setSel(open ? null : m.id); }}
            onPointerDown={() => { if (canFlag) press.current = setTimeout(() => setSel(m.id), 450); }}
            onPointerUp={() => press.current && clearTimeout(press.current)} onPointerLeave={() => press.current && clearTimeout(press.current)}
            onContextMenu={e => { if (canFlag) { e.preventDefault(); setSel(m.id); } }}>
            {head && !m.mine && <div className="chat-name" style={{ color: colorOf(m.sid) }}>{m.name}{teacher && m.grade ? <small> · {m.grade}</small> : null}</div>}
            {head && m.mine && teacher && <div className="chat-name" style={{ color: colorOf(m.sid) }}>{m.name}</div>}
            {m.img && <img className="chat-img" loading="lazy" src={`/api/chat/image/${m.id}`} alt="صورة" onClick={e => { e.stopPropagation(); setZoom(m.id); }}/>}{m.body && <span className="chat-body">{m.body}</span>}<span className="chat-time">{t(m.at)}{m.mine && <Check size={12} className="chat-tick"/>}</span>
            {teacher && <div className="chat-actions">{!!m.flags && <><span className="tag warn">{m.flags} بلاغ</span><button className="inline-action" onClick={() => clear(m.id)}>تجاهل البلاغ</button></>}<button className="inline-action danger" onClick={() => del(m.id)}><Trash2 size={13}/> حذف</button></div>}
            {open && canFlag && <div className="chat-menu" onClick={e => e.stopPropagation()}><button className="inline-action" disabled={m.iFlagged} onClick={() => { flag(m.id); setSel(null); }}><Flag size={13}/> {m.iFlagged ? "اتبلّغ" : "بلّغ المدرس عن الرسالة"}</button></div>}
          </div>
        </div>;
      })}<div ref={end}/>
    </div>
    {info && <div className="message info" role="status">{info}</div>}
    {!teacher && photo && <div className="chat-preview"><img src={photo} alt="معاينة"/><button type="button" onClick={() => setPhoto(null)} aria-label="شيل الصورة"><X size={14}/></button></div>}
    {!teacher && <form className="chat-form" onSubmit={send}>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }}/>
      <button type="button" className="chat-attach" aria-label="إرفاق صورة" onClick={() => fileRef.current?.click()}><ImagePlus size={20}/></button>
      <input className="input chat-input" value={text} maxLength={400} onChange={e => setText(e.target.value)} placeholder="اكتب رسالة" aria-label="رسالة"/>
      <button className={`chat-send ${text.trim() || photo ? "on" : ""}`} disabled={(!text.trim() && !photo) || sending} aria-label="إرسال"><Send size={18}/></button>
    </form>}
    {err && <div className="message error" role="status">{err}</div>}
    {zoom && <div className="chat-zoom" onClick={() => setZoom(null)}><img src={`/api/chat/image/${zoom}`} alt="صورة"/><button type="button" aria-label="إغلاق"><X size={22}/></button></div>}
    {!teacher && <p className="muted small">نص وصور. اضغط مطوّلا على رسالة لو عايز تبلّغ عنها. المدرس بيراجع الشات.</p>}
  </div>;
}
