import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { pool } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureQuestionTopic } from "@/lib/notify";
import { cairoDay, getStats, topicBreakdown } from "@/lib/xp";
import SiteHeader from "@/components/SiteHeader";
import ParentShare from "@/components/ParentShare";

export const metadata: Metadata = { title: "ملف الطالب", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const fmt = (d: Date | string) => new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await getCurrentUser();
  if (!me) redirect("/auth?mode=login");
  if (me.role !== "teacher") redirect("/dashboard");
  const u = (await pool.query("select u.id,u.name,u.email,u.student_code,u.parent_phone,u.grade_id,g.title grade from users u left join grades g on g.id=u.grade_id where u.id=$1 and u.role='student'", [id])).rows[0];
  if (!u) notFound();
  await ensureQuestionTopic();
  const today = cairoDay();
  const [st, topics, lects, exams, days14, token, examTopics] = await Promise.all([
    getStats(id), topicBreakdown(id),
    pool.query(`select l.title, coalesce(p.completed,false) completed, coalesce(p.seconds,0) seconds, p.updated_at from lectures l
      left join lecture_progress p on p.lecture_id=l.id and p.user_id=$1 where l.grade_id=$2 and l.published order by l.sort_order, l.created_at`, [id, u.grade_id]),
    pool.query("select e.title, e.kind, a.score, a.max_score, a.status, a.submitted_at from exam_attempts a join exams e on e.id=a.exam_id where a.user_id=$1 order by a.started_at desc limit 12", [id]),
    pool.query("select to_char(day,'YYYY-MM-DD') d, count(*)::int n from practice_answers where user_id=$1 and day > $2::date - 14 group by day", [id, today]),
    pool.query("select parent_token from user_stats where user_id=$1", [id]),
    pool.query(`select q.topic, sum(coalesce(aa.awarded,0))::int got, sum(q.points)::int pts, count(*)::int n from attempt_answers aa join questions q on q.id=aa.question_id join exam_attempts a on a.id=aa.attempt_id
      where a.user_id=$1 and a.status='graded' and q.topic is not null group by q.topic order by sum(coalesce(aa.awarded,0))::float/nullif(sum(q.points),0) asc`, [id]),
  ]);
  const map = new Map(days14.rows.map(r => [r.d as string, r.n as number]));
  const week = Array.from({ length: 14 }, (_, i) => { const d = cairoDay(new Date(Date.now() - (13 - i) * 86400000)); return { d, n: map.get(d) ?? 0 }; });
  const mx = Math.max(5, ...week.map(w => w.n));
  const done = lects.rows.filter(l => l.completed).length, started = lects.rows.filter(l => l.completed || l.seconds > 0).length;
  const weak = [...topics].filter(t => t.n >= 2).sort((a, b) => a.pct - b.pct).slice(0, 5);
  const total = topics.reduce((a, t) => a + t.n, 0), ok = topics.reduce((a, t) => a + t.ok, 0);
  const graded = exams.rows.filter(e => e.status === "graded" && e.max_score > 0);
  return <div className="app-page"><SiteHeader user={{ name: me.name, role: me.role }}/><main className="app-container">
    <Link href="/admin/students" className="app-back no-print">← كل الطلاب</Link>
    <div className="page-head"><span className="section-kicker"><span/> تقرير الطالب · {fmt(new Date())}</span><h1>{u.name}</h1><p>{u.grade || "من غير صف"} · كود {u.student_code || "-"}</p></div>
    <div className="admin-stats"><div className="admin-stat"><small>المستوى</small><strong>{st.level}</strong></div><div className="admin-stat"><small>النقاط</small><strong>{st.xp}</strong></div><div className="admin-stat"><small>السلسلة الحالية</small><strong>{st.streak} يوم</strong></div></div>
    <section className="panel" style={{ marginTop: 16 }}><h2>الحضور في المحاضرات</h2>
      <p className="small" style={{ marginTop: -8 }}>خلّص {done} من {lects.rows.length} · بدأ {started}</p>
      <div className="bar"><i style={{ width: `${lects.rows.length ? Math.round(100 * done / lects.rows.length) : 0}%` }}/></div>
      {lects.rows.map((l, i) => <div className="list-row" key={i}><div className="list-row-main"><strong>{l.title}</strong><small>{l.completed ? "خلّصها" : l.seconds > 0 ? `بدأها (${Math.max(1, Math.round(l.seconds / 60))} دقيقة)` : "لسه ماشافهاش"}{l.updated_at ? ` · ${fmt(l.updated_at)}` : ""}</small></div><span className={`tag ${l.completed ? "success" : l.seconds > 0 ? "warn" : ""}`}>{l.completed ? "✓" : l.seconds > 0 ? "جاري" : "غايب"}</span></div>)}
      {!lects.rows.length && <p className="admin-empty">مفيش محاضرات منشورة لصفه لسه.</p>}
    </section>
    <section className="panel" style={{ marginTop: 16 }}><h2>النشاط في آخر 14 يوم</h2><div className="parent-days" style={{ gridTemplateColumns: "repeat(14,1fr)" }}>{week.map(w => <div key={w.d} className="parent-day"><i><u style={{ height: (100 * w.n / mx) + "%" }}/></i><small style={{ fontSize: 9 }}>{w.n}</small></div>)}</div></section>
    <section className="panel" style={{ marginTop: 16 }}><h2>المواضيع اللي محتاجة مراجعة</h2>
      <p className="small" style={{ marginTop: -8 }}>من إجاباته في التدريب ({total} سؤال، دقة {total ? Math.round(100 * ok / total) : 0}%)</p>
      {weak.length ? weak.map(t => <div className="list-row" key={t.topic}><div className="list-row-main"><strong>{t.topic}</strong><div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${t.pct}%` }}/></div></div><span className={`tag ${t.pct < 50 ? "warn" : ""}`}>{t.pct}% · {t.n} سؤال</span></div>) : <p className="admin-empty">لسه مفيش إجابات كفاية في التدريب.</p>}
    </section>
    {examTopics.rows.length > 0 && <section className="panel" style={{ marginTop: 16 }}><h2>الضعف حسب الموضوع في الامتحانات</h2><p className="small" style={{ marginTop: -8 }}>من إجاباته في الامتحانات المصححة (الأسئلة اللي ليها موضوع)</p>{examTopics.rows.map(t => { const pct = t.pts ? Math.round(100 * t.got / t.pts) : 0; return <div className="list-row" key={t.topic}><div className="list-row-main"><strong>{t.topic}</strong><div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${pct}%` }}/></div></div><span className={`tag ${pct < 50 ? "warn" : ""}`}>{pct}% · {t.n} سؤال</span></div>; })}</section>}
    <section className="panel" style={{ marginTop: 16 }}><h2>الامتحانات والواجبات</h2>
      {graded.length > 0 && <p className="small" style={{ marginTop: -8 }}>المتوسط {Math.round(graded.reduce((a, e) => a + 100 * e.score / e.max_score, 0) / graded.length)}%</p>}
      {exams.rows.map((e, i) => <div className="list-row" key={i}><div className="list-row-main"><strong>{e.title}</strong><small>{e.kind === "homework" ? "واجب" : "امتحان"}{e.submitted_at ? ` · ${fmt(e.submitted_at)}` : ""}</small></div><span className="tag purple">{e.status === "graded" ? `${e.score} / ${e.max_score}` : e.status === "submitted" ? "مستني التصحيح" : "لم يُسلَّم"}</span></div>)}
      {!exams.rows.length && <p className="admin-empty">لسه ماحلش امتحانات.</p>}
    </section>
    <ParentShare id={id} name={u.name.split(" ")[0]} phone={u.parent_phone} existing={token.rows[0]?.parent_token || null}/>
  </main></div>;
}
