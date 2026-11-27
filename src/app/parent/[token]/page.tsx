import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pool } from "@/db";
import { cairoDay, levelFloor, levelOf, topicBreakdown } from "@/lib/xp";
import { StatsStrip } from "@/components/PracticeClient";

export const metadata: Metadata = { title: "تقرير تقدّم الطالب | منصة مهندس فارس عماد", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ParentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{20,40}$/.test(token)) notFound();
  const st = await pool.query(`select s.user_id, s.xp, s.streak, s.best, to_char(s.last_day,'YYYY-MM-DD') last_day, u.name, g.title grade
    from user_stats s join users u on u.id=s.user_id left join grades g on g.id=u.grade_id where s.parent_token=$1`, [token]);
  const s = st.rows[0]; if (!s) notFound();
  const today = cairoDay(); const yest = cairoDay(new Date(Date.now() - 86400000));
  const streak = s.last_day === today || s.last_day === yest ? s.streak : 0;
  const lv = levelOf(s.xp);
  const [days, tot, exams, lec, topics] = await Promise.all([
    pool.query("select to_char(day,'YYYY-MM-DD') d, count(*)::int n from practice_answers where user_id=$1 and day > $2::date - 7 group by day", [s.user_id, today]),
    pool.query("select count(*)::int n, count(*) filter (where correct)::int ok from practice_answers where user_id=$1", [s.user_id]),
    pool.query("select e.title, a.score, a.max_score from exam_attempts a join exams e on e.id=a.exam_id where a.user_id=$1 and a.status='graded' and a.max_score>0 order by a.submitted_at desc nulls last limit 5", [s.user_id]),
    pool.query("select count(*)::int n from lecture_progress where user_id=$1 and completed", [s.user_id]),
    topicBreakdown(s.user_id),
  ]);
  const map = new Map(days.rows.map(r => [r.d as string, r.n as number]));
  const week = Array.from({ length: 7 }, (_, i) => { const d = cairoDay(new Date(Date.now() - (6 - i) * 86400000)); return { d, n: map.get(d) ?? 0, label: new Date(d + "T12:00:00Z").toLocaleDateString("ar-EG", { weekday: "short", timeZone: "UTC" }) }; });
  const max = Math.max(5, ...week.map(w => w.n));
  const active = week.filter(w => w.n > 0).length;
  const acc = tot.rows[0].n ? Math.round(100 * tot.rows[0].ok / tot.rows[0].n) : null;
  const first = String(s.name).split(" ")[0];
  const weak = [...topics].filter(t => t.n >= 2).sort((a, b) => a.pct - b.pct)[0];
  return <div className="app-page"><div className="parent-wrap">
    <div className="section-kicker"><span/>تقرير ولي الأمر</div>
    <h1 style={{ margin: "8px 0 4px" }}>تقدّم {first}</h1>
    <p className="muted small">{s.grade ?? ""} · منصة مهندس فارس عماد · للقراءة فقط</p>
    <StatsStrip s={{ xp: s.xp, level: lv, from: levelFloor(lv), to: levelFloor(lv + 1), streak, best: s.best, doneToday: false, todayAnswers: 0, todayCorrect: 0, goal: 5, dayXp: 0, cap: 200, parentToken: null }}/>
    <div className="parent-grid">
      <div className="parent-stat"><b>{active} / 7</b><span>أيام نشطة هذا الأسبوع</span></div>
      <div className="parent-stat"><b>{acc === null ? "-" : acc + "%"}</b><span>دقة الإجابات في التدريب ({tot.rows[0].n} سؤال)</span></div>
      <div className="parent-stat"><b>{lec.rows[0].n}</b><span>محاضرات مكتملة</span></div>
      <div className="parent-stat"><b>{s.best}</b><span>أطول سلسلة أيام</span></div>
    </div>
    <div className="panel"><h2>النشاط في آخر ٧ أيام</h2><div className="parent-days">{week.map(w => <div key={w.d} className="parent-day"><i><u style={{ height: (100 * w.n / max) + "%" }}/></i>{w.label}<br/>{w.n}</div>)}</div></div>
    {weak && <div className="panel"><h2>يحتاج مراجعة</h2><p>أضعف موضوع حالياً: <b>{weak.topic}</b> ({weak.pct}% إجابات صحيحة).</p></div>}
    <div className="panel"><h2>نتائج الامتحانات</h2>{exams.rows.length ? exams.rows.map((e, i) => <div className="list-row" key={i}><div className="list-row-main"><strong>{e.title}</strong></div><span className="tag purple">{e.score} / {e.max_score}</span></div>) : <p className="muted small">لا توجد نتائج امتحانات بعد.</p>}</div>
    <p className="muted small" style={{ textAlign: "center" }}>هذا الرابط خاص. يمكن للطالب إلغاؤه في أي وقت.</p>
  </div></div>;
}
