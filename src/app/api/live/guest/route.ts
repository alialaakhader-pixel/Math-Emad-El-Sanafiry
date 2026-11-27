import crypto from "crypto";
import { AccessToken } from "livekit-server-sdk";
import { allowAttempt, jsonError, sameOrigin } from "@/lib/auth";
import { liveConfigured, readInviteCode, roomFor, roomState } from "@/lib/live";
import { db } from "@/db";
import { grades } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
// No login: a guest holds a signed, revocable invite for exactly one live room.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  if (!liveConfigured()) return jsonError("الحصص المباشرة لم تُفعَّل بعد.", 503);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!await allowAttempt(`liveguest:${ip}`, 20, 60 * 60 * 1000)) return jsonError("محاولات كثيرة. حاول لاحقاً.", 429);
  const { code, name } = await request.json().catch(() => ({}));
  const inv = readInviteCode(code);
  const guestName = typeof name === "string" ? name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 40) : "";
  if (!inv) return jsonError("رابط الدعوة غير صالح.", 403);
  if (guestName.length < 2) return jsonError("اكتب اسمك (حرفين على الأقل).");
  try {
    const s = await roomState(inv.gradeId);
    if (!s.live) return jsonError("الحصة لم تبدأ أو انتهت.", 409);
    if (inv.exp < Date.now() || !s.invites.some(i => i.n === inv.nonce)) return jsonError("انتهت هذه الدعوة أو ألغاها المدرس.", 403);
    const [g] = await db.select({ title: grades.title }).from(grades).where(eq(grades.id, inv.gradeId)).limit(1);
    const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, { identity: `g-${crypto.randomBytes(8).toString("hex")}`, name: `${guestName} (ضيف)`, ttl: "3h", metadata: JSON.stringify({ role: "guest" }) });
    at.addGrant({ roomJoin: true, room: roomFor(inv.gradeId), canPublish: true, canSubscribe: true, canPublishData: true, roomCreate: false, roomAdmin: false });
    return Response.json({ token: await at.toJwt(), url: process.env.LIVEKIT_URL, gradeTitle: g?.title || "" });
  } catch (e) { console.error("live guest", e); return jsonError("تعذر الانضمام الآن.", 503); }
}
