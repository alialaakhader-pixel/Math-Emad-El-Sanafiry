"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowUpLeft, Eye, EyeOff, GraduationCap, LockKeyhole, ShieldAlert } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

export default function TeacherLoginClient() {
  const [pw, setPw] = useState(""); const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [locked, setLocked] = useState(false); const [ok, setOk] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault(); if (busy || !pw) return; setBusy(true); setErr(""); setLocked(false);
    try {
      const r = await fetch("/api/auth/teacher-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { setOk(true); window.location.href = j.redirect || "/admin"; return; }
      if (r.status === 429) { setLocked(true); setErr("محاولات كثيرة. استنى شوية وجرّب تاني."); }
      else setErr(r.status === 401 ? "كلمة المرور غير صحيحة. تأكد منها وجرّب تاني." : (j.error || "تعذر تسجيل الدخول."));
      setPw("");
    } catch { setErr("تعذر الاتصال بالخادم. تأكد من الإنترنت وجرّب تاني."); }
    setBusy(false);
  }
  return <div className="app-page"><SiteHeader/><div className="auth-page"><aside className="auth-aside"><span className="section-kicker"><span/> لوحة المدرس</span><div className="auth-symbol" aria-hidden="true">π</div><h2>مكانك لإدارة<br/><span>المنصة كلها.</span></h2><p>المحاضرات، الاختبارات، بنك الأسئلة، الطلاب والاشتراكات، في مكان واحد.</p></aside>
    <main className="auth-main"><div className="auth-card tl-card">
      <Link href="/auth?mode=login" className="app-back"><ArrowLeft size={15}/> دخول الطلاب</Link>
      <div className="tl-badge" aria-hidden="true"><GraduationCap size={26}/></div>
      <span className="section-kicker"><span/> للمدرس فقط</span>
      <h1>دخول المدرس</h1><p className="muted">اكتب كلمة مرور المدرس للدخول إلى لوحة الإدارة.</p>
      {err && <div role="alert" className="message error">{locked ? <ShieldAlert size={17}/> : <LockKeyhole size={17}/>} {err}</div>}
      <form onSubmit={go} noValidate>
        <div className="form-field"><label htmlFor="tpw">كلمة مرور المدرس</label>
          <div style={{ position: "relative" }}>
            <input id="tpw" className={`input ${err && !locked ? "tl-bad" : ""}`} type={show ? "text" : "password"} autoFocus autoComplete="current-password" dir="ltr" value={pw} onChange={e => { setPw(e.target.value); if (err && !locked) setErr(""); }} placeholder="••••••••" aria-invalid={!!err} style={{ paddingLeft: 44, textAlign: "left" }}/>
            <button type="button" className="inline-action" style={{ position: "absolute", left: 9, top: 8 }} onClick={() => setShow(!show)} aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
          </div></div>
        <button className="btn btn-primary btn-large" type="submit" disabled={busy || ok || !pw}>{busy || ok ? "جارٍ الدخول..." : "دخول لوحة المدرس"}<ArrowUpLeft size={17}/></button>
      </form>
      <div className="auth-bottom">طالب؟ <Link href="/auth?mode=login">سجّل دخولك من هنا</Link></div>
    </div></main></div></div>;
}
