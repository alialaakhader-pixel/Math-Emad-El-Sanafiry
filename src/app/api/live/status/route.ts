import { canAccessGrade, getCurrentUser, jsonError } from "@/lib/auth";
import { liveConfigured, roomState, validId } from "@/lib/live";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل الدخول أولاً.", 401);
  if (!liveConfigured()) return Response.json({ configured: false, live: false, count: 0 });
  const gradeId = new URL(request.url).searchParams.get("gradeId");
  if (!validId(gradeId)) return jsonError("حدد الصف.");
  if (user.role !== "teacher" && !(await canAccessGrade(user, gradeId))) return jsonError("الحصة المباشرة لمشتركي هذا الصف فقط.", 403);
  try {
    const s = await roomState(gradeId);
    return Response.json({ configured: true, live: s.live, count: s.count, participants: user.role === "teacher" ? s.names : undefined });
  } catch (e) { console.error("live status", e); return jsonError("تعذر الاتصال بخدمة البث.", 503); }
}
