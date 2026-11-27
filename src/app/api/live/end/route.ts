import { pool } from "@/db";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { liveConfigured, roomClient, roomFor, validId } from "@/lib/live";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return jsonError("للمدرس فقط.", 403);
  if (!liveConfigured()) return jsonError("الحصص المباشرة لم تُفعَّل بعد.", 503);
  const { gradeId } = await request.json().catch(() => ({}));
  if (!validId(gradeId)) return jsonError("حدد الصف.");
  try { await roomClient().deleteRoom(roomFor(gradeId)); await pool.query("delete from live_files where grade_id = $1", [gradeId]); return Response.json({ ok: true }); }
  catch (e) { console.error("live end", e); return jsonError("تعذر إنهاء الحصة.", 503); }
}
