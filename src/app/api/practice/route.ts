import { getCurrentUser, jsonError, sameOrigin, allowAttempt } from "@/lib/auth";
import { pool } from "@/db";
import { cairoDay, DAILY_CAP, DAY_GOAL, getStats, levelOf, yesterday } from "@/lib/xp";

export const dynamic = "force-dynamic";
const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

// A round: mistakes first, then questions not seen yet, then the oldest answered ones.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك أولاً.", 401);
  const topic = new URL(request.url).searchParams.get("topic");
  const { rows } = await pool.query(`
    with last as (select distinct on (qid) qid, correct, at from practice_answers where user_id=$1 order by qid, at desc)
    select q.id, q.topic, q.q, q.options, l.correct is false as missed, (l.qid is null) as fresh
    from practice_questions q left join last l on l.qid=q.id
    where ($2::uuid is null or q.grade_id is null or q.grade_id=$2) and ($3::text is null or q.topic=$3)
    order by (l.correct is false) desc, (l.qid is null) desc, l.at asc nulls first, random() limit 5`, [user.id, user.gradeId, topic]);
  const questions = rows.map(r => ({
    id: r.id, topic: r.topic, q: r.q, missed: r.missed, fresh: r.fresh,
    options: shuffle((r.options as string[]).map((text, i) => ({ i, text }))),
  }));
  return Response.json({ questions: shuffle(questions) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك أولاً.", 401);
  if (!await allowAttempt(`practice:${user.id}`, 120, 60 * 60 * 1000)) return jsonError("أجبت على أسئلة كثيرة. خذ استراحة وارجع بعد قليل.", 429);
  let b: { qid?: string; choice?: number };
  try { b = await request.json(); } catch { return jsonError("طلب غير صالح."); }
  if (typeof b.qid !== "string" || !Number.isInteger(b.choice)) return jsonError("طلب غير صالح.");
  const { rows } = await pool.query("select correct, why, options from practice_questions where id=$1 and ($2::uuid is null or grade_id is null or grade_id=$2)", [b.qid, user.gradeId]);
  const q = rows[0];
  if (!q) return jsonError("السؤال غير موجود.", 404);
  const ok = b.choice === q.correct;
  const today = cairoDay();
  const before = await getStats(user.id);
  const seen = await pool.query("select 1 from practice_answers where user_id=$1 and qid=$2 and day=$3 limit 1", [user.id, b.qid, today]);
  await pool.query("insert into practice_answers(user_id,qid,correct,day) values ($1,$2,$3,$4)", [user.id, b.qid, ok, today]);
  let gain = seen.rowCount ? 0 : (ok ? 10 : 2);
  gain = Math.max(0, Math.min(gain, DAILY_CAP - before.dayXp));
  const n = before.todayAnswers + 1;
  let streak = before.streak; let best = before.best; let streakUp = false;
  if (n >= DAY_GOAL && !before.doneToday) {
    const prev = await pool.query("select to_char(last_day,'YYYY-MM-DD') d from user_stats where user_id=$1", [user.id]);
    streak = prev.rows[0].d === yesterday() ? before.streak + 1 : 1; best = Math.max(best, streak); streakUp = true;
    await pool.query("update user_stats set streak=$2,best=$3,last_day=$4 where user_id=$1", [user.id, streak, best, today]);
  }
  await pool.query("update user_stats set xp=xp+$2, day=$3, day_xp=$4 where user_id=$1", [user.id, gain, today, before.dayXp + gain]);
  const xp = before.xp + gain;
  return Response.json({ correct: ok, answer: q.correct, why: q.why, gain, xp, level: levelOf(xp), levelUp: levelOf(xp) > before.level, streak, streakUp, todayAnswers: n });
}
