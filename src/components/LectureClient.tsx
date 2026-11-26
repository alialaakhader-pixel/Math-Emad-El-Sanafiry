"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowUpLeft, BookOpen, CheckCircle2, CirclePlay, Download, FileText, LockKeyhole, Play } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

function videoSource(raw: string | null) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com") {
      const id = host === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.split("/embed/")[1];
      if (id && /^[\w-]{11}$/.test(id)) return { type: "embed", url: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return { type: "embed", url: `https://player.vimeo.com/video/${id}` };
    }
    if (/\.(mp4|webm)(\?.*)?$/i.test(raw)) return { type: "video", url: raw };
    return { type: "external", url: raw };
  } catch { return null; }
}
export default function LectureClient({ user, lecture, allowed, files, roadmap, saved }: { user: { name: string; role: string }; lecture: { id: string; title: string; description: string; videoUrl: string | null; freePreview: boolean; gradeTitle: string; termTitle: string | null; unitTitle: string | null }; allowed: boolean; files: { id: string; fileName: string; mimeType: string; size: number }[]; roadmap: { id: string; title: string; freePreview: boolean }[]; saved: { seconds: number; completed: boolean } | null }) {
  const videoRef = useRef<HTMLVideoElement>(null); const lastSave = useRef(0);
  const [complete, setComplete] = useState(!!saved?.completed); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const external = videoSource(lecture.videoUrl);
  const uploadedVideo = files.find(f => f.mimeType.startsWith("video/"));
  const documentFiles = files.filter(f => f.mimeType === "application/pdf");
  async function save(seconds: number, completed = false) {
    if (user.role !== "student" || !allowed) return;
    setBusy(true);
    try { const res = await fetch("/api/student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "updateProgress", lectureId: lecture.id, seconds: Math.floor(seconds), completed }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); if (completed) { setComplete(true); setMessage("تم حفظ المحاضرة كمكتملة في حسابك."); } }
    catch (e) { setMessage(e instanceof Error ? e.message : "تعذر حفظ التقدم."); }
    finally { setBusy(false); }
  }
  function tick() { const current = videoRef.current?.currentTime || 0; if (current - lastSave.current >= 15) { lastSave.current = current; save(current); } }
  return <div className="app-page"><SiteHeader user={user}/><main className="app-container"><Link href={user.role === "teacher" ? "/admin" : "/dashboard"} className="app-back"><ArrowLeft size={15}/> العودة إلى {user.role === "teacher" ? "الإدارة" : "لوحة الطالب"}</Link><div className="page-head"><span className="section-kicker"><span/> {lecture.gradeTitle}{lecture.termTitle ? ` / ${lecture.termTitle}` : ""}{lecture.unitTitle ? ` / ${lecture.unitTitle}` : ""}</span><h1>{lecture.title}</h1><p>{allowed ? "تابع الدرس واحفظ تقدمك في رحلتك التعليمية." : "هذه المحاضرة متاحة للمشتركين في هذا الصف."}</p></div><div className="lecture-layout"><div><div className="video-frame">{!allowed ? <div className="video-placeholder"><LockKeyhole size={42}/><h2>هذه المحاضرة محمية بالاشتراك</h2><p>فعّل اشتراك صفك من لوحة الطالب للوصول إلى الفيديو والملفات.</p><Link href="/dashboard" className="btn btn-primary">تفعيل اشتراك <ArrowUpLeft size={16}/></Link></div> : external?.type === "embed" ? <iframe src={external.url} title={`فيديو: ${lecture.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/> : external?.type === "video" ? <video ref={videoRef} src={external.url} controls playsInline preload="metadata" onLoadedMetadata={e => { if (saved?.seconds && e.currentTarget.duration > saved.seconds) e.currentTarget.currentTime = saved.seconds; }} onTimeUpdate={tick} onPause={e => save(e.currentTarget.currentTime)} onEnded={e => save(e.currentTarget.duration, true)}/> : uploadedVideo ? <video ref={videoRef} src={`/api/files/${uploadedVideo.id}`} controls playsInline preload="metadata" onLoadedMetadata={e => { if (saved?.seconds && e.currentTarget.duration > saved.seconds) e.currentTarget.currentTime = saved.seconds; }} onTimeUpdate={tick} onPause={e => save(e.currentTarget.currentTime)} onEnded={e => save(e.currentTarget.duration, true)}/> : external?.type === "external" ? <div className="video-placeholder"><CirclePlay size={43}/><h2>مصدر الفيديو الخارجي</h2><p>افتح رابط البث الذي أضافه المدرس في نافذة جديدة.</p><a className="btn btn-primary" href={external.url} target="_blank" rel="noopener noreferrer">فتح الفيديو <ArrowUpLeft size={16}/></a></div> : <div className="video-placeholder"><CirclePlay size={43}/><h2>لا يوجد فيديو مرفق بعد</h2><p>سيظهر الفيديو هنا عندما يضيفه المدرس.</p></div>}</div>{message && <div className="message" role="status">{message}</div>}{allowed && <section className="panel" style={{ marginTop: 18 }}><div className="dashboard-section-head"><h2>عن المحاضرة</h2>{complete && <span className="tag success"><CheckCircle2 size={13}/> مكتملة</span>}</div><p className="lecture-description">{lecture.description || "لم يُضف وصف لهذه المحاضرة بعد."}</p>{user.role === "student" && !complete && <button className="btn btn-outline" disabled={busy} onClick={() => save(videoRef.current?.currentTime || saved?.seconds || 0, true)}><CheckCircle2 size={16}/> تحديد كمكتملة</button>}</section>}</div><aside><section className="panel"><h2>محتوى الصف</h2>{roadmap.length ? roadmap.map((item, i) => <Link href={`/lecture/${item.id}`} key={item.id} className="student-card-link" style={{ borderColor: item.id === lecture.id ? "var(--violet)" : undefined }}><span><Play size={14}/></span><span><strong>{item.title}</strong><small>محاضرة {i + 1}</small></span></Link>) : <p className="small">لا توجد محاضرات أخرى.</p>}</section>{allowed && <section className="panel" style={{ marginTop: 17 }}><h2>المذكرات والملفات</h2>{documentFiles.length ? documentFiles.map(f => <a className="file-link" href={`/api/files/${f.id}`} key={f.id} target="_blank" rel="noopener noreferrer"><FileText size={19} color="var(--violet)"/><span>{f.fileName}<br/><small className="muted">{Math.ceil(f.size / 1024)} KB</small></span><Download size={17}/></a>) : <div className="empty-state compact"><BookOpen size={22}/><h3>لا توجد ملفات مرفقة</h3><p>تظهر المذكرات هنا إذا أضافها المدرس.</p></div>}</section>}</aside></div></main></div>;
}
