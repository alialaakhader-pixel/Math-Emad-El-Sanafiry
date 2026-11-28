"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowUpLeft, Check, GraduationCap } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

type Grade = { id: string; title: string; stage: string };

export default function WelcomeClient({ name, grades }: { name: string; grades: Grade[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!picked) { setError("اختار صفك الأول."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setGrade", gradeId: picked }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الصف.");
      router.push("/dashboard"); router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الاتصال بالخادم. حاول تاني.");
      setBusy(false);
    }
  }

  return <div className="app-page"><SiteHeader/>
    <main className="app-container welcome-page">
      <Link href="/" className="app-back"><ArrowLeft size={15}/> الرئيسية</Link>
      <div className="welcome-card">
        <span className="section-kicker"><span/> خطوة أخيرة</span>
        <h1>أهلاً {name} 👋</h1>
        <p className="muted">اختار صفك الدراسي، ونجهّز لك المنصة على مقاسك: محاضرات صفك، امتحاناته، وتدريب على مستواه.</p>
        {grades.length ? <>
          <div className="grade-options" role="radiogroup" aria-label="الصف الدراسي">
            {grades.map(g => <button key={g.id} type="button" role="radio" aria-checked={picked === g.id} className={`grade-option${picked === g.id ? " selected" : ""}`} onClick={() => { setPicked(g.id); setError(""); }}>
              <span className="grade-option-mark">{picked === g.id ? <Check size={18}/> : <GraduationCap size={18}/>}</span>
              <span className="grade-option-copy"><strong>{g.title}</strong>{g.stage ? <small>{g.stage}</small> : null}</span>
            </button>)}
          </div>
          {error && <div className="message error" role="alert">{error}</div>}
          <button type="button" className="btn btn-primary btn-large welcome-submit" disabled={busy || !picked} onClick={save}>{busy ? "جارٍ الحفظ..." : "ابدأ الآن"}<ArrowUpLeft size={17}/></button>
          <p className="welcome-note">تقدر تغيّر صفك في أي وقت من «حسابي وأجهزتي».</p>
        </> : <div className="empty-state">
          <GraduationCap size={26}/>
          <h3>الصفوف لسه بتتضاف</h3>
          <p>المدرس لسه بينشر الصفوف. تقدر تدخل حسابك وتستعمل أدوات المنصة، وهتلاقي صفك هنا أول ما ينزل.</p>
          <Link href="/dashboard" className="btn btn-outline">افتح حسابي <ArrowUpLeft size={15}/></Link>
        </div>}
      </div>
    </main>
  </div>;
}
