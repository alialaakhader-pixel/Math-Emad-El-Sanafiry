import { randomUUID } from "node:crypto";
import { db, pool } from "@/db";
import { adminLogs } from "@/db/schema";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { parseBulk } from "@/lib/practice-parse";

export const dynamic = "force-dynamic";
const uuidOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const t = (v: unknown, max: number) => typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
async function log(actorId: string, action: string, details: string) { await db.insert(adminLogs).values({ actorId, action, details: details.slice(0, 500) }); }
async function teacher() { const u = await getCurrentUser(); return u && u.role === "teacher" ? u : null; }

export async function GET() {
  if (!await teacher()) return jsonError("غير مصرح.", 403);
  const [g, q] = await Promise.all([
    pool.query("select id, title from grades order by sort_order"),
    pool.query(`select q.id, q.grade_id as "gradeId", q.topic, q.q, q.options, q.correct, q.why,
      coalesce(a.n,0)::int as answers, coalesce(a.ok,0)::int as right
      from practice_questions q left join (select qid, count(*) n, count(*) filter (where correct) ok from practice_answers group by qid) a on a.qid=q.id
      order by q.topic, q.id`),
  ]);
  return Response.json({ grades: g.rows, questions: q.rows });
}

type Clean = { gradeId: string | null; topic: string; q: string; options: string[]; correct: number; why: string };
async function resolveGrade(v: unknown): Promise<string | null | undefined> {
  if (v === null || v === "" || v === "all") return null;
  if (!uuidOk(v)) return undefined;
  const r = await pool.query("select 1 from grades where id=$1", [v]); return r.rowCount ? v : undefined;
}
function clean(b: Record<string, unknown>, gradeId: string | null): Clean | string {
  const topic = t(b.topic, 60); const q = t(b.q, 600); const why = t(b.why, 800);
  const options = Array.isArray(b.options) ? b.options.map(o => t(o, 200)) : [];
  const correct = Number(b.correct);
  if (!topic) return "اكتب الموضوع.";
  if (!q) return "اكتب نص السؤال.";
  if (options.length !== 4 || options.some(o => !o)) return "لازم 4 اختيارات كلهم مكتوبين.";
  if (new Set(options.map(o => o.toLowerCase())).size !== 4) return "فيه اختيارين متشابهين.";
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) return "اختار الإجابة الصحيحة.";
  if (!why) return "اكتب الشرح اللي هيظهر بعد الإجابة.";
  return { gradeId, topic, q, options, correct, why };
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await teacher(); if (!user) return jsonError("غير مصرح.", 403);
  if (Number(request.headers.get("content-length") || 0) > 200000) return jsonError("الطلب كبير جداً.", 413);
  let b: Record<string, unknown>; try { b = await request.json(); } catch { return jsonError("طلب غير صالح."); }

  if (b.action === "save") {
    const gradeId = await resolveGrade(b.gradeId); if (gradeId === undefined) return jsonError("اختار الصف.");
    const c = clean(b, gradeId); if (typeof c === "string") return jsonError(c);
    if (b.id) {
      if (typeof b.id !== "string") return jsonError("طلب غير صالح.");
      const r = await pool.query("update practice_questions set grade_id=$2, topic=$3, q=$4, options=$5, correct=$6, why=$7 where id=$1", [b.id, c.gradeId, c.topic, c.q, JSON.stringify(c.options), c.correct, c.why]);
      if (!r.rowCount) return jsonError("السؤال غير موجود.", 404);
      await log(user.id, "practice_update", `${b.id} ${c.topic}`); return Response.json({ ok: true, message: "اتعدل السؤال." });
    }
    const id = "t-" + randomUUID();
    await pool.query("insert into practice_questions(id,grade_id,topic,q,options,correct,why) values ($1,$2,$3,$4,$5,$6,$7)", [id, c.gradeId, c.topic, c.q, JSON.stringify(c.options), c.correct, c.why]);
    await log(user.id, "practice_create", `${id} ${c.topic}`); return Response.json({ ok: true, message: "اتضاف السؤال." });
  }

  if (b.action === "delete") {
    if (typeof b.id !== "string") return jsonError("طلب غير صالح.");
    const r = await pool.query("delete from practice_questions where id=$1 returning topic", [b.id]);
    if (!r.rowCount) return jsonError("السؤال غير موجود.", 404);
    await log(user.id, "practice_delete", `${b.id} ${r.rows[0].topic}`); return Response.json({ ok: true, message: "اتمسح السؤال." });
  }

  if (b.action === "bulk") {
    if (typeof b.text !== "string" || !b.text.trim()) return jsonError("الصق الأسئلة الأول.");
    const defGrade = await resolveGrade(b.gradeId ?? null); if (defGrade === undefined) return jsonError("اختار الصف.");
    const defTopic = t(b.topic, 60);
    const gs = (await pool.query("select id, title from grades")).rows as { id: string; title: string }[];
    const norm = (s: string) => s.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
    const parsed = parseBulk(b.text);
    const errors = [...parsed.errors]; const items: (Clean & { n: number })[] = []; const seen = new Set<string>();
    const existing = new Set((await pool.query("select q from practice_questions")).rows.map(r => norm(r.q as string)));
    parsed.ok.forEach((p, i) => {
      let gradeId = defGrade;
      if (p.gradeName) {
        if (["عام", "الكل", "كل الصفوف"].includes(p.gradeName)) gradeId = null;
        else { const g = gs.find(x => norm(x.title) === norm(p.gradeName!) || norm(x.title).includes(norm(p.gradeName!))); if (!g) { errors.push({ block: i + 1, text: p.q.slice(0, 60), error: `الصف "${p.gradeName}" مش موجود.` }); return; } gradeId = g.id; }
      }
      const c = clean({ topic: p.topic || defTopic, q: p.q, options: p.options, correct: p.correct, why: p.why }, gradeId);
      if (typeof c === "string") { errors.push({ block: i + 1, text: p.q.slice(0, 60), error: c === "اكتب الموضوع." ? "ناقص الموضوع (اكتبه فوق أو في سطر الموضوع:)" : c }); return; }
      const key = norm(c.q);
      if (existing.has(key) || seen.has(key)) { errors.push({ block: i + 1, text: c.q.slice(0, 60), error: "السؤال ده موجود قبل كده." }); return; }
      seen.add(key); items.push({ ...c, n: i + 1 });
    });
    if (items.length > 200) return jsonError("الحد الأقصى 200 سؤال في المرة.");
    if (b.dryRun) return Response.json({ ok: true, count: items.length, errors });
    if (errors.length) return Response.json({ error: "فيه أخطاء في الأسئلة. صلّحها أو شيلها وجرب تاني.", errors }, { status: 400 });
    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const c of items) await client.query("insert into practice_questions(id,grade_id,topic,q,options,correct,why) values ($1,$2,$3,$4,$5,$6,$7)", ["t-" + randomUUID(), c.gradeId, c.topic, c.q, JSON.stringify(c.options), c.correct, c.why]);
      await client.query("commit");
    } catch (e) { await client.query("rollback"); console.error(e); return jsonError("تعذر الحفظ.", 500); } finally { client.release(); }
    await log(user.id, "practice_bulk", `${items.length} questions`);
    return Response.json({ ok: true, count: items.length, message: `اتضاف ${items.length} سؤال.` });
  }
  return jsonError("إجراء غير معروف.");
}
