"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowUpLeft, CheckCircle2, Eye, EyeOff, GraduationCap, LockKeyhole } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

type Mode = "register" | "login" | "recover" | "reset";
export default function AuthClient({ grades, googleAvailable, mode: initialMode, token, error }: { grades: { id: string; title: string }[]; googleAvailable: boolean; mode: string; token: string; error: string }) {
  const router = useRouter();
  const mode: Mode = ["register", "login", "recover", "reset"].includes(initialMode) ? initialMode as Mode : "register";
  const [parentPhone, setParentPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [gradeId, setGradeId] = useState("");
  const titles = { register: "ابدأ رحلتك معنا", login: "مرحباً بعودتك", recover: "استعادة كلمة المرور", reset: "كلمة مرور جديدة" };
  const descriptions = { register: "أنشئ حسابك لتبدأ تعلّم الرياضيات بطريقتك.", login: "أدخل بياناتك لمتابعة رحلتك التعليمية.", recover: "سنرسل رابط الاستعادة إلى بريدك إذا كان مسجلاً.", reset: "اختر كلمة مرور قوية لحماية حسابك." };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setIsError(false);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, gradeId, token, parentPhone }) });
      const data = await response.json();
      if (!response.ok) { setIsError(true); setMessage(data.error || "تعذر إتمام العملية."); return; }
      setMessage(data.message || "تمت العملية بنجاح.");
      if (data.redirect) { router.push(data.redirect); router.refresh(); }
    } catch { setIsError(true); setMessage("تعذر الاتصال بالخادم. تأكد من اتصالك وحاول مجدداً."); }
    finally { setBusy(false); }
  }
  return <div className="app-page"><SiteHeader/><div className="auth-page"><aside className="auth-aside"><span className="section-kicker"><span/> أكاديمية الرياضيات</span><div className="auth-symbol" aria-hidden="true">∑</div><h2>كل فكرة عظيمة<br/><span>تبدأ بسؤال.</span></h2><p>مساحتك لتفهم، تجرّب، وتكتشف الرياضيات خطوة بخطوة مع منصة مستر عماد السنافيري.</p></aside><main className="auth-main"><div className="auth-card"><Link href="/" className="app-back"><ArrowLeft size={15}/> العودة إلى الرئيسية</Link><span className="section-kicker"><span/> حسابك في المنصة</span><h1>{titles[mode]}</h1><p className="muted">{descriptions[mode]}</p>{error && <div className="message error">{error === "google_unavailable" ? "تسجيل Google غير مهيأ حالياً." : "تعذر تسجيل الدخول بـ Google. حاول مجدداً."}</div>}{message && <div role="status" className={`message ${isError ? "error" : ""}`}>{!isError && <CheckCircle2 size={17}/>} {message}</div>}
  <form onSubmit={submit}>
    {mode === "register" && <div className="form-field"><label htmlFor="name">اسمك الكامل</label><input className="input" id="name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="أدخل اسمك الكامل"/></div>}
    {mode === "register" && <div className="form-field"><label htmlFor="pp">رقم ولي الأمر</label><input className="input" id="pp" dir="ltr" type="tel" inputMode="tel" autoComplete="tel" required value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="01xxxxxxxxx"/></div>}
    {mode !== "reset" && <div className="form-field"><label htmlFor="email">{mode === "login" ? "البريد الإلكتروني أو رقم الطالب (ID)" : "البريد الإلكتروني"}</label><input className="input" id="email" type={mode === "login" ? "text" : "email"} inputMode={mode === "login" ? "email" : undefined} autoCapitalize="none" autoComplete={mode === "login" ? "username" : "email"} required value={email} onChange={e => setEmail(e.target.value)} placeholder={mode === "login" ? "name@example.com أو 123456" : "name@example.com"} dir="ltr" style={{ textAlign: "right" }}/></div>}
    {mode === "register" && <div className="form-field"><label htmlFor="grade">الصف الدراسي <span className="muted small">(اختياري)</span></label><select className="input" id="grade" value={gradeId} onChange={e => setGradeId(e.target.value)}><option value="">اختر لاحقاً</option>{grades.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select>{!grades.length && <small className="hint">لم تُنشر صفوف دراسية بعد. يمكنك اختيار صفك لاحقاً.</small>}</div>}
    {mode !== "recover" && <div className="form-field"><label htmlFor="password">{mode === "reset" ? "كلمة المرور الجديدة" : "كلمة المرور"}</label><div style={{ position: "relative" }}><input className="input" id="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "login" ? undefined : 10} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "login" ? "أدخل كلمة المرور" : "10 أحرف على الأقل"} style={{ paddingLeft: 44 }}/><button type="button" className="inline-action" style={{ position: "absolute", left: 9, top: 8 }} onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>}
    {mode === "login" && <div style={{ textAlign: "left", margin: "-3px 0 17px" }}><Link href="/auth?mode=recover" className="auth-link small">نسيت كلمة المرور؟</Link></div>}
    <button className="btn btn-primary btn-large" type="submit" disabled={busy}>{busy ? "جارٍ التنفيذ..." : mode === "register" ? "إنشاء حساب" : mode === "login" ? "تسجيل الدخول" : mode === "recover" ? "إرسال رابط الاستعادة" : "تحديث كلمة المرور"}<ArrowUpLeft size={17}/></button>
  </form>
  {(mode === "login" || mode === "register") && googleAvailable && <><div className="auth-divider">أو</div><a className="google-button" href="/api/auth/google"><span className="google-g">G</span> المتابعة باستخدام Google</a></>}
  <div className="auth-bottom">{mode === "register" ? <>لديك حساب بالفعل؟ <Link href="/auth?mode=login">سجّل الدخول</Link></> : mode === "login" ? <>ليس لديك حساب؟ <Link href="/auth?mode=register">أنشئ حساباً</Link></> : <Link href="/auth?mode=login">العودة إلى تسجيل الدخول</Link>}</div>
  {(mode === "login" || mode === "register") && <Link href="/auth/teacher" className="auth-teacher-link"><GraduationCap size={16}/> دخول المدرس</Link>}
  </div></main></div></div>;
}
