import { pool } from "@/db";
import { canAccessGrade, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { ensureSubmissions, notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip = (v: unknown, n: number) => typeof v === "string" ? v.trim().slice(0, n) : "";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك.", 401);
  await ensureSubmissions();
  if (user.role === "teacher") {
    const { rows } = await pool.query(
      `select h.id, h.body, h.status, h.comment, h.created_at, h.updated_at, h.reviewed_at, h.asset_id,
              a.file_name, a.mime_type, u.name student, g.title grade, e.title exam, e.kind
       from homework_submissions h join users u on u.id=h.user_id join exams e on e.id=h.exam_id
       left join grades g on g.id=e.grade_id left join assets a on a.id=h.asset_id
       order by (h.status='submitted') desc, h.updated_at desc limit 200`);
    return Response.json({ items: rows.map(r => ({ id: r.id, body: r.body, status: r.status, comment: r.comment, at: r.updated_at, assetId: r.asset_id, fileName: r.file_name, mime: r.mime_type, student: r.student, grade: r.grade, exam: r.exam, kind: r.kind })) });
  }
  if (user.role !== "student") return jsonError("غير مسموح.", 403);
  const examId = new URL(request.url).searchParams.get("examId") || "";
  if (!uuid.test(examId)) return jsonError("امتحان غير صالح.");
  const { rows } = await pool.query(
    `select h.body, h.status, h.comment, h.updated_at, h.asset_id, a.file_name from homework_submissions h
     left join assets a on a.id=h.asset_id where h.exam_id=$1 and h.user_id=$2`, [examId, user.id]);
  const r = rows[0];
  return Response.json({ submission: r ? { body: r.body, status: r.status, comment: r.comment, at: r.updated_at, assetId: r.asset_id, fileName: r.file_name } : null });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك.", 401);
  await ensureSubmissions();
  const b = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (user.role === "teacher") {
    const id = typeof b.id === "string" && uuid.test(b.id) ? b.id : "";
    if (!id) return jsonError("تسليم غير صالح.");
    const comment = clip(b.comment, 1000);
    const { rows } = await pool.query(
      `update homework_submissions set status='reviewed', comment=$2, reviewed_at=now() where id=$1 returning user_id, exam_id`, [id, comment]);
    if (!rows[0]) return jsonError("التسليم مش موجود.", 404);
    const e = await pool.query("select title from exams where id=$1", [rows[0].exam_id]);
    await notifyUser(rows[0].user_id, "المدرس راجع تسليمك", comment ? `«${e.rows[0]?.title}»: ${comment}` : `«${e.rows[0]?.title}» اتراجع.`);
    return Response.json({ ok: true, message: "تمت المراجعة وبعتنا إشعار للطالب." });
  }
  if (user.role !== "student") return jsonError("غير مسموح.", 403);
  const examId = typeof b.examId === "string" && uuid.test(b.examId) ? b.examId : "";
  const body = clip(b.text, 4000);
  const assetId = typeof b.assetId === "string" && uuid.test(b.assetId) ? b.assetId : null;
  if (!examId) return jsonError("امتحان غير صالح.");
  if (!body && !assetId) return jsonError("اكتب إجابتك أو ارفع صورة أو ملف.");
  const ex = await pool.query("select grade_id from exams where id=$1 and published", [examId]);
  if (!ex.rows[0]) return jsonError("الامتحان مش موجود.", 404);
  if (!(await canAccessGrade(user, ex.rows[0].grade_id)) || user.gradeId !== ex.rows[0].grade_id) return jsonError("ده مش لصفك.", 403);
  if (assetId) {
    const a = await pool.query("select 1 from assets where id=$1 and owner_id=$2", [assetId, user.id]);
    if (!a.rows[0]) return jsonError("الملف مش بتاعك.", 403);
  }
  await pool.query(
    `insert into homework_submissions(exam_id,user_id,body,asset_id) values ($1,$2,$3,$4)
     on conflict (exam_id,user_id) do update set body=excluded.body, asset_id=coalesce(excluded.asset_id, homework_submissions.asset_id), status='submitted', reviewed_at=null, updated_at=now()`,
    [examId, user.id, body, assetId]);
  return Response.json({ ok: true, message: "تم التسليم. المدرس هيشوفه." });
}
