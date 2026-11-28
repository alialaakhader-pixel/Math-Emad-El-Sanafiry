import { getCurrentUser, jsonError, allowAttempt } from "@/lib/auth";
import { pool } from "@/db";
import { chat } from "@/lib/ai";
import { cacheGet, cacheSet } from "@/lib/aicache";
import { cairoDay } from "@/lib/xp";
import { ensureQuestionTopic } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SYS = `أنت مرشد دراسي لطالب باكالوريا/ثانوي في الرياضيات. هتاخد نقاط ضعفه وقوته بالنسب، وتعمل له خطة مذاكرة لـ 5 أيام. لكل يوم: موضوع واحد أو اتنين، نشاط محدد (حل كام سؤال من التدريب، مراجعة قانون معين، إلخ) ومدة بالدقايق (30 إلى 45). ابدأ بأضعف المواضيع. بعربية مصرية بسيطة ومشجعة، بدون LaTeX. شكل الرد: سطر «اليوم 1: ...» لكل يوم، وبعدهم سطر «نصيحة:» واحد. لا تخترع مواضيع مش في القائمة.`;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return jsonError("سجّل دخولك أولاً.", 401);
  await ensureQuestionTopic();
  const pr = await pool.query(`select q.topic, count(*)::int n, round(100.0*avg((l.correct)::int))::int pct from (select distinct on (qid) qid, correct from practice_answers where user_id=$1 order by qid, at desc) l join practice_questions q on q.id=l.qid group by q.topic`, [user.id]);
  const ex = await pool.query(`select q.topic, count(*)::int n, round(100.0*sum(aa.awarded)/nullif(sum(q.points),0))::int pct from attempt_answers aa join exam_attempts a on a.id=aa.attempt_id join questions q on q.id=aa.question_id where a.user_id=$1 and a.status='graded' and aa.awarded is not null and q.topic is not null group by q.topic`, [user.id]);
  const map = new Map<string, { n: number; w: number }>();
  for (const r of [...pr.rows, ...ex.rows]) { if (r.pct == null) continue; const c = map.get(r.topic) || { n: 0, w: 0 }; c.n += r.n; c.w += r.pct * r.n; map.set(r.topic, c); }
  const topics = [...map.entries()].map(([topic, c]) => ({ topic, n: c.n, pct: Math.round(c.w / c.n) })).sort((a, b) => a.pct - b.pct);
  if (topics.length < 2) return Response.json({ topics, plan: null, reason: "حل شوية أسئلة تدريب أو امتحانات الأول علشان أعرف نقاط ضعفك." });
  const ck = `plan:${user.id}:${cairoDay()}:${topics.map(t => t.topic + t.pct).join("|")}`.slice(0, 400);
  const hit = await cacheGet(ck); if (hit) return Response.json({ topics, plan: hit });
  if (!await allowAttempt("plan-global-day", 200, 24 * 60 * 60 * 1000)) return Response.json({ topics, plan: null, reason: "خطة الذكاء الاصطناعي وصلت للحد اليومي المجاني. جرّب بكرة." });
  const plan = await chat(SYS, topics.slice(0, 12).map(t => `${t.topic}: ${t.pct}% (من ${t.n} سؤال)`).join("\n"), { max: 700, temp: 0.4, ms: 45000, cheap: true });
  if (!plan) return Response.json({ topics, plan: null, reason: "مقدرتش أعمل الخطة دلوقتي. جرّب بعد شوية." });
  await cacheSet(ck, plan);
  return Response.json({ topics, plan });
}
