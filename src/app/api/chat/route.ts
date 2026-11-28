import { pool } from "@/db";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { ensureChat } from "@/lib/notify";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PER_MINUTE = 8;
const first = (n: string) => (n || "").trim().split(/\s+/)[0] || "طالب";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك.", 401);
  await ensureChat();
  const url = new URL(request.url);
  let gradeId: string | null = null;
  if (user.role === "teacher") {
    const g = url.searchParams.get("gradeId") || "";
    gradeId = uuid.test(g) ? g : null;
  } else if (user.role === "student") gradeId = user.gradeId;
  else return jsonError("غير مسموح.", 403);
  const flaggedOnly = user.role === "teacher" && url.searchParams.get("flagged") === "1";
  if (!gradeId && !(user.role === "teacher" && flaggedOnly)) return Response.json({ needGrade: true, messages: [] });
  const { rows } = await pool.query(
    `select * from (
       select m.id, m.body, m.created_at, m.user_id, u.name, g.title grade, g.id grade_id,
              (select count(*)::int from chat_flags f where f.message_id=m.id) flags,
              exists(select 1 from chat_flags f where f.message_id=m.id and f.user_id=$1) i_flagged
       from chat_messages m join users u on u.id=m.user_id left join grades g on g.id=m.grade_id
       where ($2::uuid is null or m.grade_id=$2) and (not $3 or exists(select 1 from chat_flags f where f.message_id=m.id))
       order by m.created_at desc limit 80) t order by created_at asc`, [user.id, gradeId, flaggedOnly]);
  const gt = gradeId ? (await pool.query("select title from grades where id=$1", [gradeId])).rows[0]?.title : null;
  const fl = user.role === "teacher" ? (await pool.query("select count(*)::int n from chat_messages m where exists(select 1 from chat_flags f where f.message_id=m.id)")).rows[0].n : 0;
  return Response.json({
    grade: gt, flaggedTotal: fl, me: user.id,
    messages: rows.map(r => ({ id: r.id, body: r.body, at: r.created_at, mine: r.user_id === user.id, name: user.role === "teacher" ? r.name : first(r.name), grade: r.grade, flags: user.role === "teacher" ? r.flags : undefined, iFlagged: r.i_flagged })),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك.", 401);
  await ensureChat();
  const b = await request.json().catch(() => ({})) as Record<string, unknown>;
  const mid = typeof b.id === "string" && uuid.test(b.id) ? b.id : "";
  if (b.action === "delete") {
    if (user.role !== "teacher") return jsonError("للمدرس بس.", 403);
    if (!mid) return jsonError("رسالة غير صالحة.");
    await pool.query("delete from chat_messages where id=$1", [mid]);
    return Response.json({ ok: true });
  }
  if (b.action === "clearFlags") {
    if (user.role !== "teacher" || !mid) return jsonError("غير مسموح.", 403);
    await pool.query("delete from chat_flags where message_id=$1", [mid]);
    return Response.json({ ok: true });
  }
  if (user.role !== "student" || !user.gradeId) return jsonError("الشات للطلاب اللي اختاروا صفهم.", 403);
  if (b.action === "flag") {
    if (!mid) return jsonError("رسالة غير صالحة.");
    const m = await pool.query("select 1 from chat_messages where id=$1 and grade_id=$2 and user_id<>$3", [mid, user.gradeId, user.id]);
    if (!m.rows[0]) return jsonError("مينفعش تبلّغ عن الرسالة دي.");
    await pool.query("insert into chat_flags(message_id,user_id) values ($1,$2) on conflict do nothing", [mid, user.id]);
    return Response.json({ ok: true, message: "اتبعت بلاغ للمدرس." });
  }
  const text = typeof b.text === "string" ? b.text.replace(/\s+/g, " ").trim().slice(0, 400) : "";
  if (!text) return jsonError("اكتب رسالة.");
  const rate = await pool.query("select count(*)::int n, max(body) filter (where created_at > now() - interval '30 seconds') last_body from chat_messages where user_id=$1 and created_at > now() - interval '1 minute'", [user.id]);
  if (rate.rows[0].n >= PER_MINUTE) return jsonError("براحة شوية، استنى دقيقة وابعت تاني.", 429);
  if (rate.rows[0].last_body === text) return jsonError("الرسالة دي اتبعتت لسه.", 429);
  await pool.query("insert into chat_messages(grade_id,user_id,body) values ($1,$2,$3)", [user.gradeId, user.id, text]);
  return Response.json({ ok: true });
}
