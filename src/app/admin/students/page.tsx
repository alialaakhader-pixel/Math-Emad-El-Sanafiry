import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { pool } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";
import StudentsOverview from "@/components/StudentsOverview";

export const metadata: Metadata = { title: "متابعة الطلاب", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?mode=login");
  if (user.role !== "teacher") redirect("/dashboard");
  const { rows } = await pool.query(`
    select u.id, u.name, g.title grade, u.grade_id, coalesce(s.xp,0)::int xp, coalesce(s.streak,0)::int streak,
      (select count(*)::int from lecture_progress p join lectures l on l.id=p.lecture_id where p.user_id=u.id and p.completed and l.published) done,
      (select count(*)::int from lectures l where l.grade_id=u.grade_id and l.published) total,
      (select round(100*avg(a.score::numeric/a.max_score))::int from exam_attempts a where a.user_id=u.id and a.status='graded' and a.max_score>0) exam_avg,
      (select count(*)::int from practice_answers pa where pa.user_id=u.id) answers,
      (select count(*) filter (where correct)::int from practice_answers pa where pa.user_id=u.id) ok,
      greatest(
        (select max(day)::timestamptz from practice_answers pa where pa.user_id=u.id),
        (select max(updated_at) from lecture_progress p where p.user_id=u.id),
        (select max(started_at) from exam_attempts a where a.user_id=u.id)) last_active
    from users u left join grades g on g.id=u.grade_id left join user_stats s on s.user_id=u.id
    where u.role='student' order by u.created_at desc`);
  const items = rows.map(r => ({ id: r.id, name: r.name, grade: r.grade, xp: r.xp, streak: r.streak, done: r.done, total: r.total, examAvg: r.exam_avg, acc: r.answers ? Math.round(100 * r.ok / r.answers) : null, answers: r.answers, last: r.last_active ? new Date(r.last_active).toISOString() : null }));
  return <div className="app-page"><SiteHeader user={{ name: user.name, role: user.role }}/><main className="app-container"><Link href="/admin" className="app-back">← لوحة المدرس</Link><div className="page-head"><span className="section-kicker"><span/> متابعة</span><h1>كل الطلاب في نظرة</h1></div><StudentsOverview items={items}/></main></div>;
}
