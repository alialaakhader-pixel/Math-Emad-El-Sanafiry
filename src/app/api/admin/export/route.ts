import { pool } from "@/db";
import { getCurrentUser, jsonError } from "@/lib/auth";

export const dynamic = "force-dynamic";
const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return jsonError("غير مصرح.", 403);
  const examId = new URL(req.url).searchParams.get("examId") || "";
  if (!/^[0-9a-f-]{36}$/i.test(examId)) return jsonError("معرّف غير صالح.");
  const ex = (await pool.query("select title from exams where id=$1", [examId])).rows[0];
  if (!ex) return jsonError("الامتحان مش موجود.", 404);
  const rows = (await pool.query("select u.name, u.email, u.student_code, a.score, a.max_score, a.status, a.submitted_at from exam_attempts a join users u on u.id=a.user_id where a.exam_id=$1 order by u.name, a.started_at", [examId])).rows;
  const head = ["الاسم", "الإيميل", "كود الطالب", "الدرجة", "من", "النسبة", "الحالة", "وقت التسليم"];
  const st: Record<string, string> = { graded: "اتصحح", pending_review: "بانتظار التصحيح", in_progress: "لسه بيحل" };
  const lines = [head.map(cell).join(",")].concat(rows.map(r => [r.name, r.email, r.student_code, r.score, r.max_score, r.max_score ? Math.round((r.score / r.max_score) * 100) + "%" : "", st[r.status] || r.status, r.submitted_at ? new Date(r.submitted_at).toISOString() : ""].map(cell).join(",")));
  return new Response("\uFEFF" + lines.join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=\"results.csv\"", "Cache-Control": "no-store" } });
}
