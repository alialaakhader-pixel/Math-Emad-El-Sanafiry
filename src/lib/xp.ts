import "server-only";
import { pool } from "@/db";

export const DAILY_CAP = 200;
export const DAY_GOAL = 5; // answers needed to keep the streak
export const levelOf = (xp: number) => Math.floor(Math.sqrt(xp / 50)) + 1;
export const levelFloor = (lv: number) => 50 * (lv - 1) * (lv - 1);
export const cairoDay = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
export const yesterday = () => cairoDay(new Date(Date.now() - 86400000));

export async function getStats(userId: string) {
  await pool.query("insert into user_stats(user_id) values ($1) on conflict do nothing", [userId]);
  const { rows } = await pool.query("select xp,streak,best,to_char(last_day,'YYYY-MM-DD') last_day,to_char(day,'YYYY-MM-DD') as day,day_xp,parent_token from user_stats where user_id=$1", [userId]);
  const s = rows[0]; const today = cairoDay();
  const alive = s.last_day === today || s.last_day === yesterday();
  const t = await pool.query("select count(*)::int n, count(*) filter (where correct)::int ok from practice_answers where user_id=$1 and day=$2", [userId, today]);
  const lv = levelOf(s.xp);
  return {
    xp: s.xp as number, level: lv, from: levelFloor(lv), to: levelFloor(lv + 1),
    streak: alive ? (s.streak as number) : 0, best: s.best as number, doneToday: s.last_day === today,
    todayAnswers: t.rows[0].n as number, todayCorrect: t.rows[0].ok as number, goal: DAY_GOAL,
    dayXp: s.day === today ? (s.day_xp as number) : 0, cap: DAILY_CAP, parentToken: (s.parent_token as string | null) ?? null,
  };
}

export async function topicBreakdown(userId: string) {
  const { rows } = await pool.query(`select q.topic, count(*)::int n, count(*) filter (where a.correct)::int ok
    from practice_answers a join practice_questions q on q.id=a.qid where a.user_id=$1 group by q.topic order by q.topic`, [userId]);
  return rows.map(r => ({ topic: r.topic as string, n: r.n as number, ok: r.ok as number, pct: Math.round(100 * r.ok / r.n) }));
}
export const weakest = (b: { topic: string; n: number; pct: number }[]) => [...b].filter(x => x.n >= 2).sort((a, c) => a.pct - c.pct)[0] ?? null;
