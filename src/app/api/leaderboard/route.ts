import { pool } from "@/db";
import { getCurrentUser, jsonError } from "@/lib/auth";
import { cairoDay, levelOf, yesterday } from "@/lib/xp";

export const dynamic = "force-dynamic";
const first = (n: string) => (n || "").trim().split(/\s+/)[0] || "طالب";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك.", 401);
  if (user.role !== "student") return jsonError("الترتيب للطلاب.", 403);
  if (!user.gradeId) return Response.json({ needGrade: true });
  const today = cairoDay(), y = yesterday();
  const { rows } = await pool.query(
    `select u.id, u.name, s.xp, s.streak, to_char(s.last_day,'YYYY-MM-DD') last_day
     from users u join user_stats s on s.user_id=u.id
     where u.role='student' and u.grade_id=$1 and s.xp>0
     order by s.xp desc, s.best desc, u.created_at asc`, [user.gradeId]);
  const all = rows.map((r, i) => ({
    rank: i + 1, id: r.id as string, name: first(r.name), xp: r.xp as number, level: levelOf(r.xp),
    streak: r.last_day === today || r.last_day === y ? (r.streak as number) : 0,
  }));
  const idx = all.findIndex(r => r.id === user.id);
  const top = all.slice(0, 10).map(r => ({ rank: r.rank, name: r.name, xp: r.xp, level: r.level, streak: r.streak, me: r.id === user.id }));
  let me = idx >= 0 ? { rank: all[idx].rank, name: all[idx].name, xp: all[idx].xp, level: all[idx].level, streak: all[idx].streak, me: true } : null;
  const gap = idx > 0 ? all[idx - 1].xp - all[idx].xp : null;
  const g = await pool.query("select title from grades where id=$1", [user.gradeId]);
  return Response.json({ grade: g.rows[0]?.title ?? "", total: all.length, top, me, gapToNext: gap, myName: first(user.name) });
}
