import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { liveConfigured, roomClient, roomFor, validId } from "@/lib/live";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return jsonError("للمدرس فقط.", 403);
  if (!liveConfigured()) return jsonError("الحصص المباشرة لم تُفعَّل بعد.", 503);
  const { gradeId, identity } = await request.json().catch(() => ({}));
  if (!validId(gradeId) || typeof identity !== "string" || !/^(s-[0-9a-f-]{36}|g-[0-9a-f]{16})$/i.test(identity)) return jsonError("بيانات غير صالحة.");
  try { await roomClient().removeParticipant(roomFor(gradeId), identity); return Response.json({ ok: true }); }
  catch (e) { console.error("live kick", e); return jsonError("تعذر إخراج الطالب.", 503); }
}
