"use client";
import "@livekit/components-styles";
import { useState } from "react";
import dynamic from "next/dynamic";
import { GridLayout, LiveKitRoom, ParticipantTile, RoomAudioRenderer, useLocalParticipant, useParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, PenTool, Camera, X } from "lucide-react";

const Whiteboard = dynamic(() => import("./Whiteboard"), { ssr: false, loading: () => <div className="live-loading">جارٍ تحميل السبورة...</div> });
type Props = { token: string; url: string; gradeId: string; gradeTitle: string; teacher: boolean; onLeave: () => void };

export default function LiveRoom(p: Props) {
  const [media, setMedia] = useState("");
  return <LiveKitRoom serverUrl={p.url} token={p.token} connect audio video onDisconnected={p.onLeave}
    onMediaDeviceFailure={() => setMedia("تعذر تشغيل الكاميرا أو الميكروفون. اسمح بالإذن من إعدادات المتصفح، ثم اضغط زر الكاميرا.")}
    data-lk-theme="default" className="live-room" dir="rtl">
    <RoomInner {...p} media={media}/>
    <RoomAudioRenderer/>
  </LiveKitRoom>;
}

function RoomInner({ gradeId, gradeTitle, teacher, onLeave, media }: Props & { media: string }) {
  const [tab, setTab] = useState<"video" | "board" | "people">("video");
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
  async function kick(identity: string) {
    if (!confirm("إخراج هذا الطالب من الحصة؟")) return;
    await fetch("/api/live/kick", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gradeId, identity }) }).catch(() => null);
  }
  return <div className="live-shell">
    <header className="live-top"><strong><span className="live-dot"/> حصة مباشرة · {gradeTitle}</strong><span className="small">{participants.length} في الغرفة</span></header>
    <nav className="live-tabs" aria-label="أقسام الغرفة">
      <button type="button" className={tab === "video" ? "on" : ""} onClick={() => setTab("video")}><Camera size={16}/> الكاميرات</button>
      <button type="button" className={tab === "board" ? "on" : ""} onClick={() => setTab("board")}><PenTool size={16}/> السبورة</button>
      <button type="button" className={tab === "people" ? "on" : ""} onClick={() => setTab("people")}><Users size={16}/> الحضور</button>
    </nav>
    <div className="live-main">
      <section className={`live-pane live-video${tab === "video" ? " show" : ""}`}>
        <GridLayout tracks={tracks} style={{ height: "100%" }}><ParticipantTile/></GridLayout>
      </section>
      <section className={`live-pane live-board${tab === "board" ? " show" : ""}`}><Whiteboard isTeacher={teacher}/></section>
      <section className={`live-pane live-people${tab === "people" ? " show" : ""}`}>
        <h3>الحضور ({participants.length})</h3>
        <ul>{participants.map(pt => <li key={pt.identity}><span>{pt.name || pt.identity}{pt.identity.startsWith("t-") ? " · المدرس" : ""}{pt.isLocal ? " (أنت)" : ""}</span>
          <span className="small">{pt.isMicrophoneEnabled ? "🎤" : "🔇"} {pt.isCameraEnabled ? "📷" : "🚫"}</span>
          {teacher && !pt.isLocal && <button type="button" className="inline-action danger" onClick={() => kick(pt.identity)}><X size={13}/> إخراج</button>}</li>)}</ul>
      </section>
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
