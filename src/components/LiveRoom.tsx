"use client";
import "@livekit/components-styles";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LiveKitRoom, ParticipantTile, RoomAudioRenderer, useLocalParticipant, useParticipants, useTracks } from "@livekit/components-react";
import { Track, VideoPresets, type RoomOptions } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, PenTool, Camera, X, UserPlus, Copy, FileText, Upload, Trash2 } from "lucide-react";

const Whiteboard = dynamic(() => import("./Whiteboard"), { ssr: false, loading: () => <div className="live-loading">جارٍ تحميل السبورة...</div> });
type Props = { token: string; url: string; gradeId: string; gradeTitle: string; teacher: boolean; guest?: boolean; onLeave: () => void };

export default function LiveRoom(p: Props) {
  const [media, setMedia] = useState("");
  // Teacher publishes 720p at up to 2.5 Mbps with simulcast so phones get a sharp picture; others publish lighter 360p.
  const options: RoomOptions = {
    adaptiveStream: true, dynacast: true,
    videoCaptureDefaults: { resolution: p.teacher ? VideoPresets.h720.resolution : VideoPresets.h360.resolution, facingMode: "user" },
    publishDefaults: { simulcast: true, videoEncoding: p.teacher ? { maxBitrate: 2_500_000, maxFramerate: 30 } : { maxBitrate: 600_000, maxFramerate: 24 }, videoSimulcastLayers: [VideoPresets.h360, VideoPresets.h540] },
  };
  return <LiveKitRoom serverUrl={p.url} token={p.token} connect audio video options={options} onDisconnected={p.onLeave}
    onMediaDeviceFailure={() => setMedia("تعذر تشغيل الكاميرا أو الميكروفون. اسمح بالإذن من إعدادات المتصفح، ثم اضغط زر الكاميرا.")}
    data-lk-theme="default" className="live-room" dir="rtl">
    <RoomInner {...p} media={media}/>
    <RoomAudioRenderer/>
  </LiveKitRoom>;
}

function RoomInner({ gradeId, gradeTitle, teacher, guest, onLeave, media }: Props & { media: string }) {
  const [tab, setTab] = useState<"video" | "board" | "people" | "files">("video");
  const [boardOpened, setBoardOpened] = useState(false);
  useEffect(() => { if (tab === "board") setBoardOpened(true); }, [tab]);
  const [msg, setMsg] = useState("");
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  async function toggle(kind: "mic" | "cam") {
    setMsg("");
    try { if (kind === "mic") await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled); else await localParticipant.setCameraEnabled(!isCameraEnabled); }
    catch { setMsg("لم يسمح المتصفح بالوصول. فعّل إذن الكاميرا والميكروفون لهذا الموقع."); }
  }
  async function endClass() {
    if (!confirm("إنهاء الحصة لكل الطلاب؟")) return;
    await fetch("/api/live/end", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gradeId }) }).catch(() => null);
    onLeave();
  }
  const [invite, setInvite] = useState(""); const [copied, setCopied] = useState(false);
  async function inviteCall(action: "create" | "revoke") {
    setMsg("");
    const r = await fetch("/api/live/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gradeId, action }) }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) { setMsg(d?.error || "تعذر تنفيذ الطلب."); return; }
    if (action === "create") { setInvite(d.url); setCopied(false); } else setInvite("");
  }
  async function shareInvite() {
    try { if (navigator.share) { await navigator.share({ title: "دعوة للحصة المباشرة", url: invite }); return; } } catch { /* user cancelled */ }
    try { await navigator.clipboard.writeText(invite); setCopied(true); } catch { setMsg("انسخ الرابط يدوياً من المربع."); }
  }
  type LF = { id: string; name: string; mime: string; size: number; by: string };
  const [files, setFiles] = useState<LF[]>([]); const [studentUploads, setStudentUploads] = useState(false); const [upBusy, setUpBusy] = useState(false);
  async function loadFiles() {
    if (guest) return;
    const r = await fetch(`/api/live/files?gradeId=${gradeId}`).catch(() => null); const d = await r?.json().catch(() => null);
    if (r?.ok && d) { setFiles(d.files || []); setStudentUploads(!!d.studentUploads); }
  }
  useEffect(() => { if (guest) return; void loadFiles(); const t = setInterval(loadFiles, tab === "files" ? 6000 : 20000); return () => clearInterval(t); }, [tab, guest, gradeId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function upload(f: File | undefined) {
    if (!f) return; setUpBusy(true); setMsg("");
    const fd = new FormData(); fd.append("gradeId", gradeId); fd.append("file", f);
    const r = await fetch("/api/live/files", { method: "POST", body: fd }).catch(() => null); const d = await r?.json().catch(() => ({}));
    if (!r?.ok) setMsg(d?.error || "تعذر رفع الملف."); else await loadFiles();
    setUpBusy(false);
  }
  async function delFile(id: string) { if (!confirm("حذف الملف من الحصة؟")) return; await fetch(`/api/live/files/${id}`, { method: "DELETE" }).catch(() => null); await loadFiles(); }
  async function toggleStudentUploads() {
    const r = await fetch("/api/live/files", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gradeId, allowStudents: !studentUploads }) }).catch(() => null);
    if (r?.ok) setStudentUploads(!studentUploads);
  }
  const canUpload = teacher || studentUploads;
  const teacherTrack = tracks.find(t => t.participant.identity.startsWith("t-"));
  const others = tracks.filter(t => t !== teacherTrack);
  async function kick(identity: string) {
    if (!confirm("إخراج هذا المشارك من الحصة؟")) return;
    await fetch("/api/live/kick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gradeId, identity }) }).catch(() => null);
  }
  return <div className="live-shell">
    <header className="live-top"><strong><span className="live-dot"/> حصة مباشرة · {gradeTitle}</strong><span className="small">{participants.length} في الغرفة</span></header>
    <nav className="live-tabs" aria-label="أقسام الغرفة">
      <button type="button" className={tab === "video" ? "on" : ""} onClick={() => setTab("video")}><Camera size={16}/> الكاميرات</button>
      <button type="button" className={tab === "board" ? "on" : ""} onClick={() => setTab("board")}><PenTool size={16}/> السبورة</button>
      <button type="button" className={tab === "people" ? "on" : ""} onClick={() => setTab("people")}><Users size={16}/> الحضور</button>
      {!guest && <button type="button" className={tab === "files" ? "on" : ""} onClick={() => setTab("files")}><FileText size={16}/> الملفات{files.length ? ` (${files.length})` : ""}</button>}
    </nav>
    <div className="live-main">
      <section className={`live-pane live-video${tab === "video" ? " show" : ""}${tab === "board" ? " mini" : ""}`}>
        <div className="live-stage">
          <div className="live-bigtile">{teacherTrack ? <ParticipantTile trackRef={teacherTrack}/> : <div className="live-wait">في انتظار كاميرا المدرس...</div>}</div>
          {others.length > 0 && <div className="live-strip">{others.map(t => <div className="live-thumb" key={t.participant.identity}><ParticipantTile trackRef={t}/></div>)}</div>}
        </div>
      </section>
      <section className={`live-pane live-board${tab === "board" ? " show" : ""}`}>{boardOpened ? <Whiteboard isTeacher={teacher}/> : <div className="live-loading">جارٍ تحميل السبورة...</div>}</section>
      <section className={`live-pane live-people${tab === "people" ? " show" : ""}`}>
        <h3>الحضور ({participants.length})</h3>
        {teacher && <div className="live-invite">
          <button type="button" className="btn btn-primary" onClick={() => inviteCall("create")}><UserPlus size={16}/> دعوة ضيف</button>
          {invite && <>
            <input className="input" readOnly value={invite} onFocus={e => e.currentTarget.select()} dir="ltr"/>
            <div className="live-invite-row"><button type="button" className="btn btn-outline" onClick={shareInvite}><Copy size={15}/> {copied ? "تم النسخ" : "مشاركة / نسخ الرابط"}</button><button type="button" className="btn btn-outline danger" onClick={() => inviteCall("revoke")}>إلغاء الدعوة وإخراج الضيوف</button></div>
            <p className="small">الرابط صالح 4 ساعات ولهذه الحصة فقط. ابعته للضيف على واتساب.</p>
          </>}
        </div>}
        <ul>{participants.map(pt => <li key={pt.identity}><span>{pt.name || pt.identity}{pt.identity.startsWith("t-") ? " · المدرس" : pt.identity.startsWith("g-") ? " · ضيف" : ""}{pt.isLocal ? " (أنت)" : ""}</span>
          <span className="small">{pt.isMicrophoneEnabled ? "🎤" : "🔇"} {pt.isCameraEnabled ? "📷" : "🚫"}</span>
          {teacher && !pt.isLocal && <button type="button" className="inline-action danger" onClick={() => kick(pt.identity)}><X size={13}/> إخراج</button>}</li>)}</ul>
      </section>
      {!guest && <section className={`live-pane live-files${tab === "files" ? " show" : ""}`}>
        <h3>ملفات الحصة</h3>
        {canUpload && <label className="btn btn-primary live-upload"><Upload size={16}/> {upBusy ? "جارٍ الرفع..." : "إضافة ملف (PDF أو صورة)"}<input type="file" hidden accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,application/pdf,image/*" disabled={upBusy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }}/></label>}
        {teacher && <label className="small live-allow"><input type="checkbox" checked={studentUploads} onChange={toggleStudentUploads}/> اسمح للطلاب برفع ملفات</label>}
        <p className="small">أقصى حجم 4 ميجا. الملفات خاصة بطلاب هذا الصف وتُحذف عند إنهاء الحصة.</p>
        {files.length === 0 ? <p className="small">لا توجد ملفات بعد.</p> : <ul>{files.map(f => <li key={f.id}>
          <a href={`/api/live/files/${f.id}`} target="_blank" rel="noopener noreferrer"><FileText size={16}/> {f.name}</a>
          <span className="small">{(f.size / 1024 / 1024 >= 1 ? (f.size / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(f.size / 1024)) + " KB")} · {f.by}</span>
          {teacher && <button type="button" className="inline-action danger" onClick={() => delFile(f.id)}><Trash2 size={13}/> حذف</button>}</li>)}</ul>}
      </section>}
    </div>
    {(media || msg) && <p className="live-warn">{msg || media}</p>}
    <footer className="live-controls">
      <button type="button" className={`live-ctl${isMicrophoneEnabled ? "" : " off"}`} onClick={() => toggle("mic")} aria-label="الميكروفون">{isMicrophoneEnabled ? <Mic size={20}/> : <MicOff size={20}/>}<span>{isMicrophoneEnabled ? "ميكروفون" : "مكتوم"}</span></button>
      <button type="button" className={`live-ctl${isCameraEnabled ? "" : " off"}`} onClick={() => toggle("cam")} aria-label="الكاميرا">{isCameraEnabled ? <Video size={20}/> : <VideoOff size={20}/>}<span>{isCameraEnabled ? "كاميرا" : "مغلقة"}</span></button>
      <button type="button" className="live-ctl leave" onClick={teacher ? onLeave : onLeave} aria-label="مغادرة"><PhoneOff size={20}/><span>مغادرة</span></button>
      {teacher && <button type="button" className="live-ctl end" onClick={endClass}><span>إنهاء للجميع</span></button>}
    </footer>
  </div>;
}
