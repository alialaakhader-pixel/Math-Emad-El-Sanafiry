"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Video } from "lucide-react";

const LiveRoom = dynamic(() => import("./LiveRoom"), { ssr: false, loading: () => <div className="live-loading">جارٍ تجهيز غرفة البث...</div> });

export default function GuestClient({ code, configured }: { code: string; configured: boolean }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [conn, setConn] = useState<{ token: string; url: string; gradeTitle: string; gradeId: string } | null>(null);
  async function join() {
    setBusy(true); setError("");
    try {
      try { const s = await navigator.mediaDevices?.getUserMedia({ video: true, audio: true }); s?.getTracks().forEach(t => t.stop()); } catch { /* room offers retry */ }
      const r = await fetch("/api/live/guest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, name }) });
      const d = await r.json();
      if (!r.ok) setError(d.error || "تعذر الانضمام الآن.");
      else { let gid = ""; try { gid = atob(code.split(".")[0].replace(/-/g, "+").replace(/_/g, "/")).split(".")[0]; } catch { /* ignore */ } setConn({ token: d.token, url: d.url, gradeTitle: d.gradeTitle, gradeId: gid }); }
    } catch { setError("تعذر الاتصال بالخادم."); }
    setBusy(false);
  }
  if (conn) return <LiveRoom token={conn.token} url={conn.url} gradeId={conn.gradeId} gradeTitle={conn.gradeTitle} teacher={false} guest onLeave={() => setConn(null)}/>;
  return <div className="app-page"><main className="app-container" style={{ maxWidth: 520 }}>
    <div className="page-head"><span className="section-kicker"><span/> ضيف في حصة مباشرة</span><h1>منصة مهندس فارس عماد</h1><p>اتدعيت تحضر حصة مباشرة بالكاميرا والصوت.</p></div>
    {!configured || !code ? <section className="panel live-empty"><Video size={30}/><h3>الرابط غير صالح</h3><p>اطلب من المدرس رابط دعوة جديد.</p></section>
      : <section className="panel live-lobby">
        <div className="form-field"><label htmlFor="g-name">اسمك</label><input id="g-name" className="input" value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="مثال: د. أحمد"/></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="button" className="btn btn-primary btn-large" disabled={busy || name.trim().length < 2} onClick={join}>{busy ? "جارٍ الدخول..." : "انضم للحصة"}</button>
        <p className="small">سيطلب المتصفح إذن الكاميرا والميكروفون. اضغط "سماح". على الآيفون استخدم Safari.</p>
      </section>}
  </main></div>;
}
