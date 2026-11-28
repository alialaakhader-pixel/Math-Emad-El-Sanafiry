import { ArrowUpLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exams, grades } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = { title: "الامتحانات والواجبات", description: "امتحانات وواجبات تفاعلية بتصحيح فوري لكل صف دراسي." };
export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const user = await getCurrentUser();
  const [allGrades, allExams] = await Promise.all([
    db.select({ id: grades.id, title: grades.title }).from(grades).where(eq(grades.published, true)).orderBy(asc(grades.sortOrder)),
    db.select({ id: exams.id, gradeId: exams.gradeId, title: exams.title, description: exams.description, kind: exams.kind, durationMinutes: exams.durationMinutes }).from(exams).where(and(eq(exams.published, true))).orderBy(desc(exams.createdAt)),
  ]);
  const groups = allGrades.map(g => ({ g, items: allExams.filter(e => e.gradeId === g.id) })).filter(x => x.items.length);
  return <>
    <SiteHeader user={user ? { name: user.name, role: user.role } : null}/>
    <main className="container-wide" style={{ padding: "40px 16px 80px" }} dir="rtl">
      <h1>الامتحانات والواجبات</h1>
      <p className="muted">اختبارات بتوقيت، تصحيح فوري، ومراجعة للإجابات. ادخل بحسابك لتبدأ.</p>
      {!user && <div className="message info" style={{ margin: "14px 0" }}>سجّل دخولك أولاً لتقديم الامتحانات. <Link className="text-link" href="/auth?mode=login">تسجيل الدخول</Link></div>}
      {groups.length ? groups.map(({ g, items }) => <section className="panel" key={g.id} style={{ marginTop: 18 }}>
        <div className="dashboard-section-head"><h2>{g.title}</h2><span className="tag">{items.length}</span></div>
        {items.map(e => <Link className="student-card-link" key={e.id} href={user ? `/exam/${e.id}` : "/auth?mode=login"}><span><strong>{e.title}</strong><small>{e.kind === "homework" ? "واجب منزلي" : "امتحان"} · {e.durationMinutes} دقيقة</small></span></Link>)}
      </section>) : <div className="empty-state" style={{ marginTop: 20 }}><ClipboardList size={27}/><h3>لا توجد امتحانات منشورة بعد</h3><p>سيظهر هنا كل امتحان ينشره المدرس. وفي الوقت الحالي تقدر تدرّب نفسك أو تسأل عن أي مسألة.</p><div className="empty-actions"><Link className="btn btn-primary" href={user ? "/practice" : "/auth?mode=register"}>ابدأ تدريب <ArrowUpLeft size={15}/></Link><Link className="btn btn-outline" href="/solve">حلّال المسائل <ArrowUpLeft size={15}/></Link></div></div>}
    </main>
  </>;
}
