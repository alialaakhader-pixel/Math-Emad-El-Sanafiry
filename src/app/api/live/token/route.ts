import { AccessToken } from "livekit-server-sdk";
import { canAccessGrade, getCurrentUser, jsonError, sameOrigin, allowAttempt } from "@/lib/auth";
import { liveConfigured, roomFor, roomState, validId } from "@/lib/live";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل الدخول أولاً.", 401);
  if (!liveConfigured()) return jsonError("الحصص المباشرة لم تُفعَّل بعد.", 503);
  if (!await allowAttempt(`livetoken:${user.id}`, 40, 60 * 60 * 1000)) return jsonError("محاولات كثيرة. حاول لاحقاً.", 429);
  const { gradeId } = await request.json().catch(() => ({}));
  if (!validId(gradeId)) return jsonError("حدد الصف.");
  const teacher = user.role === "teacher";
  if (user.role !== "teacher" && user.role !== "student") return jsonError("غير مسموح.", 403);
  if (!teacher && !(await canAccessGrade(user, gradeId))) return jsonError("الحصة المباشرة لمشتركي هذا الصف فقط.", 403);
  try {
    if (!teacher && !(await roomState(gradeId)).live) return jsonError("الحصة لم تبدأ بعد. المدرس وحده يفتح الحصة، انتظره.", 409);
    const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, { identity: `${teacher ? "t" : "s"}-${user.id}`, name: user.name, ttl: "4h", metadata: JSON.stringify({ role: user.role }) });
    at.addGrant({ roomJoin: true, room: roomFor(gradeId), canPublish: true, canSubscribe: true, canPublishData: true, roomCreate: teacher, roomAdmin: teacher });
    return Response.json({ token: await at.toJwt(), url: process.env.LIVEKIT_URL, role: teacher ? "teacher" : "student" });
  } catch (e) { console.error("live token", e); return jsonError("تعذر بدء الحصة الآن.", 503); }
}
