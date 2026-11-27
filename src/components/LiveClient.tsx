"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Video, Radio } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

const LiveRoom = dynamic(() => import("./LiveRoom"), { ssr: false, loading: () => <div className="live-loading">جارٍ تجهيز غرفة البث...</div> });
type Grade = { id: string; title: string };
type Status = { configured: boolean; live: boolean; count: number; participants?: { identity: string; name: string }[] };

export default function LiveClient({ user, grades, configured }: { user: { name: string; role: string }; grades: Grade[]; configured: boolean }) {
  const teacher = user.role === "teacher";
  const [gradeId, setGradeId] = useState(grades[0]?.id || "");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [conn, setConn] = useState<{ token: string; url: string } | null>(null);

  const poll = useCallback(async () => {
    if (!gradeId || !configured) return;
    try {
      const r = await fetch(`/api/live/status?gradeId=${gradeId}`); const d = await r.json();
      if (!r.ok) { setError(d.error || "تعذر معرفة حالة الحصة."); setStatus(null); } else { setError(""); setStatus(d); }
    } catch { setError("تعذر الاتصال بالخادم."); }
  }, [gradeId, configured]);
  useEffect(() => { poll(); const t = setInterval(poll, 10000); return () => clearInterval(t); }, [poll]);

  async function join() {
    setBusy(true); setError("");
    try {
      // Ask for camera/mic inside the tap so iOS Safari shows its permission prompt.
      try { const s = await navigator.mediaDevices?.getUserMedia({ video: true, audio: true }); s?.getTracks().forEach(t => t.stop()); } catch { /* the room offers retry and view-only */ }
      const r = await fetch("/api/live/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gradeId }) });
      const d = await r.json();
      if (!r.ok) setError(d.error || "تعذر الانضمام الآن."); else setConn({ token: d.token, url: d.url });
    } catch { setError("تعذر الاتصال بالخادم."); }
    setBusy(false);
  }

  if (conn) return <LiveRoom token={conn.token} url={conn.url} gradeId={gradeId} gradeTitle={grades.find(g => g.id === gradeId)?.title || ""} teacher={teacher} onLeave={() => { setConn(null); poll(); }}/>;

  return <div className="app-page"><SiteHeader user={user as never}/><main className="app-container">
    <div className="page-head"><span className="section-kicker"><span/> بث مباشر</span><h1>الحصص المباشرة</h1><p>{teacher ? "افتح غرفة لصف، والطلاب ينضمون بالكاميرا، وعندك سبورة رياضيات تفاعلية." : "انضم لحصة صفك بالكاميرا والصوت، وتابع السبورة لحظة بلحظة."}</p></div>
    {!configured ? <section className="panel live-empty"><Video size={30}/><h3>الحصص المباشرة لسه متفعلتش</h3><p>بانتظار ربط خدمة البث. هتشتغل تلقائياً أول ما يتم الربط.</p></section>
      : !grades.length ? <section className="panel live-empty"><Video size={30}/><h3>مفيش صف محدد لحسابك</h3><p>اختر صفك من الملف الشخصي في لوحة الطالب.</p></section>
      : <section className="panel live-lobby">
        {grades.length > 1 && <div className="form-field"><label htmlFor="live-grade">الصف</label><select id="live-grade" className="input" value={gradeId} onChange={e => setGradeId(e.target.value)}>{grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>}
        {grades.length === 1 && <p className="small">الصف: <strong>{grades[0].title}</strong></p>}
        <div className={`live-state${status?.live ? " on" : ""}`}><Radio size={18}/> {status ? (status.live ? `الحصة شغالة الآن · ${status.count} في الغرفة` : "لا توجد حصة شغالة الآن") : "جارٍ التحقق..."}</div>
        {teacher && status?.participants && status.participants.length > 0 && <p className="small">الموجودون: {status.participants.map(p => p.name).join("، ")}</p>}
        {error && <p className="err" style={{ color: "#ff8a8a" }}>{error}</p>}
        {teacher ? <button type="button" className="btn btn-primary btn-large" disabled={busy || !gradeId} onClick={join}>{status?.live ? "ادخل الحصة الشغالة" : "ابدأ الحصة"}</button>
          : <button type="button" className="btn btn-primary btn-large" disabled={busy || !status?.live} onClick={join}>{status?.live ? "انضم للحصة" : "في انتظار المدرس"}</button>}
        <p className="small" style={{ opacity: .7 }}>سيطلب المتصفح إذن الكاميرا والميكروفون. اضغط "سماح". على الآيفون استخدم Safari.</p>
      </section>}
  </main></div>;
}
