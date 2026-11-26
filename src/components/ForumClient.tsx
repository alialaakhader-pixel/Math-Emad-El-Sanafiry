"use client";
import { useCallback, useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";

type Post = { id: string; title: string; body: string; pinned: boolean; createdAt: string; lectureId: string | null; lectureTitle?: string | null; authorId: string; authorName: string; authorRole: string; replies?: number };
type Reply = { id: string; body: string; createdAt: string; authorId: string; authorName: string; authorRole: string };
const mod = (r: string) => r === "teacher" || r === "staff";
const when = (s: string) => new Date(s).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });

export function Avatar({ id, name, size = 36 }: { id: string; name: string; size?: number }) {
  const [bad, setBad] = useState(false);
  const st = { width: size, height: size, borderRadius: "50%", flex: "0 0 auto" } as const;
  return bad ? <span style={{ ...st, display: "inline-grid", placeItems: "center", background: "rgba(168,140,255,.3)", fontWeight: 800 }}>{name.trim()[0] || "؟"}</span>
    : <img src={`/api/avatar/${id}`} alt="" width={size} height={size} style={{ ...st, objectFit: "cover" }} onError={() => setBad(true)}/>;
}
const Badge = ({ role }: { role: string }) => role === "teacher" ? <span className="tag purple">المدرس</span> : role === "staff" ? <span className="tag purple">فريق</span> : null;

export default function ForumClient({ user }: { user: { name: string; role: string } }) {
  const [posts, setPosts] = useState<Post[]>([]); const [lectures, setLectures] = useState<{ id: string; title: string }[]>([]); const [me, setMe] = useState<{ id: string; role: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null); const [detail, setDetail] = useState<{ post: Post; replies: Reply[] } | null>(null);
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [lec, setLec] = useState(""); const [reply, setReply] = useState("");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(false); const [busy, setBusy] = useState(false);
  const note = (m: string, e = false) => { setMsg(m); setErr(e); };
  const loadList = useCallback(async () => { const r = await fetch("/api/forum"); const d = await r.json(); if (r.ok) { setPosts(d.posts); setLectures(d.lectures); setMe(d.me); } else note(d.error, true); }, []);
  const loadPost = useCallback(async (id: string) => { const r = await fetch(`/api/forum?post=${id}`); const d = await r.json(); if (r.ok) { setDetail(d); setMe(d.me); } else note(d.error, true); }, []);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (open) loadPost(open); else setDetail(null); }, [open, loadPost]);
  async function post(payload: object) { setBusy(true); try { const r = await fetch("/api/forum", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); const d = await r.json(); if (!r.ok) { note(d.error || "تعذر التنفيذ.", true); return null; } note(d.message || ""); return d; } finally { setBusy(false); } }
  const canDel = (a: string) => !!me && (me.id === a || mod(me.role));
  return <div className="app-page"><SiteHeader user={user}/><main className="app-container">
    <div className="page-head"><span className="section-kicker">المجتمع</span><h1>المنتدى</h1><p>اسأل، ناقش، وساعد زملاءك. المدرس والفريق يتابعون النقاش.</p></div>
    {msg && <div className={`message ${err ? "error" : ""}`}>{msg}</div>}
    {!open && <>
      <section className="panel"><h2>منشور جديد</h2>
        <form onSubmit={async e => { e.preventDefault(); const d = await post({ action: "createPost", title, body, lectureId: lec || null }); if (d) { setTitle(""); setBody(""); setLec(""); await loadList(); setOpen(d.id); } }}>
          <div className="form-field"><label>العنوان</label><input className="input" required minLength={3} maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="سؤالك أو موضوع النقاش"/></div>
          <div className="form-field"><label>التفاصيل</label><textarea className="input" required minLength={3} maxLength={5000} rows={4} value={body} onChange={e => setBody(e.target.value)}/></div>
          <div className="form-field"><label>مرتبط بمحاضرة <span className="muted small">(اختياري)</span></label><select className="input" value={lec} onChange={e => setLec(e.target.value)}><option value="">بدون</option>{lectures.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></div>
          <button className="btn btn-primary" disabled={busy}>نشر</button>
        </form></section>
      <section className="panel" style={{ marginTop: 16 }}><h2>المنشورات</h2>
        {posts.length ? posts.map(p => <div className="list-row" key={p.id} style={{ cursor: "pointer", alignItems: "flex-start", gap: 12 }} onClick={() => setOpen(p.id)}>
          <Avatar id={p.authorId} name={p.authorName}/>
          <div className="list-row-main"><strong>{p.pinned ? "📌 " : ""}{p.title}</strong><small>{p.authorName} <Badge role={p.authorRole}/> · {when(p.createdAt)}{p.lectureTitle ? ` · ${p.lectureTitle}` : ""} · {p.replies} رد</small><small style={{ opacity: .75 }}>{p.body}</small></div>
        </div>) : <p className="muted">لا توجد منشورات بعد. كن أول من يكتب.</p>}
      </section></>}
    {open && detail && <section className="panel">
      <button type="button" className="inline-action" onClick={() => { setOpen(null); loadList(); }}>← كل المنشورات</button>
      <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "flex-start" }}><Avatar id={detail.post.authorId} name={detail.post.authorName} size={44}/>
        <div style={{ flex: 1 }}><h2 style={{ margin: 0 }}>{detail.post.pinned ? "📌 " : ""}{detail.post.title}</h2><small>{detail.post.authorName} <Badge role={detail.post.authorRole}/> · {when(detail.post.createdAt)}</small>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 10 }}>{detail.post.body}</p>
          <div className="calc-row wrap">{me && mod(me.role) && <button type="button" className="inline-action" onClick={async () => { if (await post({ action: "pin", id: detail.post.id, pinned: !detail.post.pinned })) loadPost(detail.post.id); }}>{detail.post.pinned ? "إلغاء التثبيت" : "تثبيت"}</button>}
            {canDel(detail.post.authorId) && <button type="button" className="inline-action danger" onClick={async () => { if (confirm("حذف هذا المنشور وكل ردوده؟") && await post({ action: "deletePost", id: detail.post.id })) { setOpen(null); loadList(); } }}>حذف</button>}</div></div></div>
      <h3 style={{ marginTop: 20 }}>الردود ({detail.replies.length})</h3>
      {detail.replies.map(r => <div className="list-row" key={r.id} style={{ alignItems: "flex-start", gap: 10 }}><Avatar id={r.authorId} name={r.authorName} size={32}/>
        <div className="list-row-main"><strong>{r.authorName} <Badge role={r.authorRole}/></strong><small>{when(r.createdAt)}</small><span style={{ whiteSpace: "pre-wrap" }}>{r.body}</span></div>
        {canDel(r.authorId) && <button type="button" className="inline-action danger" onClick={async () => { if (await post({ action: "deleteReply", id: r.id })) loadPost(detail.post.id); }}>حذف</button>}</div>)}
      <form style={{ marginTop: 14 }} onSubmit={async e => { e.preventDefault(); if (await post({ action: "reply", postId: detail.post.id, body: reply })) { setReply(""); loadPost(detail.post.id); } }}>
        <textarea className="input" required rows={3} maxLength={3000} value={reply} onChange={e => setReply(e.target.value)} placeholder="اكتب ردك..."/>
        <button className="btn btn-primary" style={{ marginTop: 8 }} disabled={busy}>إرسال الرد</button></form>
    </section>}
  </main></div>;
}
