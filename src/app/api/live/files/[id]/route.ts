import { canAccessGrade, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { roomState, validId } from "@/lib/live";
import { pool } from "@/db";

export const dynamic = "force-dynamic";
async function load(id: string) {
  if (!validId(id)) return null;
  const { rows } = await pool.query("select id, grade_id, name, mime, size, data from live_files where id = $1", [id]);
  return rows[0] || null;
}
// Private download: login required, same class (or teacher), and the class must be live for students.
export async function GET(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل الدخول أولاً.", 401);
  const f = await load((await ctx.params).id);
  if (!f) return jsonError("الملف غير موجود.", 404);
  if (user.role !== "teacher") {
    if (user.role !== "student" || !(await canAccessGrade(user, f.grade_id))) return jsonError("غير مسموح.", 403);
    if (!(await roomState(f.grade_id)).live) return jsonError("الحصة انتهت.", 403);
  }
  const inline = f.mime === "application/pdf" || f.mime.startsWith("image/");
  return new Response(Buffer.from(f.data, "base64"), { headers: {
    "Content-Type": f.mime, "Content-Length": String(f.size), "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
  } });
}
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return jsonError("للمدرس فقط.", 403);
  const id = (await ctx.params).id; if (!validId(id)) return jsonError("غير صالح.");
  await pool.query("delete from live_files where id = $1", [id]);
  return Response.json({ ok: true });
}
