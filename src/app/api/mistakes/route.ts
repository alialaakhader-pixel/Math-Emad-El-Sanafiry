import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { pool } from "@/db";
import { ensureQuestionTopic } from "@/lib/notify";

export const dynamic = "force-dynamic";
const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
let fixReady: Promise<unknown> | null = null;
const ensureFixes = () => (fixReady ??= pool.query("create table if not exists mistake_fixes(user_id uuid not null references users(id) on delete cascade, question_id uuid not null references questions(id) on delete cascade, at timestamptz not null default now(), primary key(user_id,question_id))").catch(e => { fixReady = null; throw e; }));

// The student's own wrong answers: latest attempt per exam question + last answer per practice question.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك أولاً.", 401);
  if (user.role !== "student") return jsonError("للطلاب بس.", 403);
  await ensureQuestionTopic(); await ensureFixes();
  const ex = await pool.query(`
    select * from (select distinct on (q.id) q.id, q.prompt as q, q.options, q.topic, aa.awarded, a.submitted_at
      from attempt_answers aa join exam_attempts a on a.id=aa.attempt_id join questions q on q.id=aa.question_id
      where a.user_id=$1 and a.status<>'in_progress' and q.kind='mcq' order by q.id, a.submitted_at desc nulls last) t
    where awarded=0 and not exists (select 1 from mistake_fixes f where f.user_id=$1 and f.question_id=t.id and f.at > coalesce(t.submitted_at, 'epoch'))`, [user.id]);
  const pr = await pool.query(`
    with last as (select distinct on (qid) qid, correct from practice_answers where user_id=$1 order by qid, at desc)
    select q.id, q.topic, q.q, q.options from practice_questions q join last l on l.qid=q.id
    where l.correct is false and (q.grade_id is null or q.grade_id=$2)`, [user.id, user.gradeId]);
  const items = [
    ...ex.rows.map(r => ({ key: "e:" + r.id, src: "exam", topic: r.topic || "امتحان", q: r.q as string, options: r.options as string[] })),
    ...pr.rows.map(r => ({ key: "p:" + r.id, src: "practice", topic: r.topic as string, q: r.q as string, options: r.options as string[] })),
  ];
  const total = items.length;
  const picked = shuffle(items).slice(0, 10).map(it => ({ key: it.key, src: it.src, topic: it.topic, q: it.q, options: shuffle(it.options.map((text, i) => ({ i, text }))) }));
  return Response.json({ total, questions: picked });
}

// Check an exam question (practice questions are checked by /api/practice).
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return jsonError("سجّل دخولك أولاً.", 401);
  let b: { qid?: string; choice?: number };
  try { b = await request.json(); } catch { return jsonError("طلب غير صالح."); }
  if (typeof b.qid !== "string" || !/^[0-9a-f-]{36}$/i.test(b.qid) || !Number.isInteger(b.choice)) return jsonError("طلب غير صالح.");
  await ensureFixes();
  const { rows } = await pool.query("select q.correct_index from questions q where q.id=$1 and q.kind='mcq' and exists (select 1 from attempt_answers aa join exam_attempts a on a.id=aa.attempt_id where a.user_id=$2 and aa.question_id=q.id)", [b.qid, user.id]);
  if (!rows[0]) return jsonError("السؤال مش موجود.", 404);
  const ok = b.choice === rows[0].correct_index;
  if (ok) await pool.query("insert into mistake_fixes(user_id,question_id) values ($1,$2) on conflict (user_id,question_id) do update set at=now()", [user.id, b.qid]);
  return Response.json({ correct: ok, answer: rows[0].correct_index });
}
