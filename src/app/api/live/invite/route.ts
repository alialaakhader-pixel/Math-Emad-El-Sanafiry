import crypto from "crypto";
import { getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";
import { liveConfigured, makeInviteCode, roomClient, roomFor, roomState, setInvites, validId } from "@/lib/live";

export const dynamic = "force-dynamic";
// Teacher only. create: new one-room guest link (4h). revoke: remove every invite for the room and kick guests already inside.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "teacher") return jsonError("المدرس فقط يقدر يدعو ضيف.", 403);
  if (!liveConfigured()) return jsonError("الحصص المباشرة لم تُفعَّل بعد.", 503);
  const { gradeId, action } = await request.json().catch(() => ({}));
  if (!validId(gradeId)) return jsonError("حدد الصف.");
  try {
    const s = await roomState(gradeId);
    if (!s.live) return jsonError("ابدأ الحصة أولاً ثم ادعُ الضيف.", 409);
    if (action === "revoke") {
      await setInvites(gradeId, []);
      for (const p of s.names) if (p.identity.startsWith("g-")) await roomClient().removeParticipant(roomFor(gradeId), p.identity).catch(() => null);
      return Response.json({ ok: true });
    }
    const n = crypto.randomBytes(8).toString("hex"), exp = Date.now() + 4 * 3600 * 1000;
    await setInvites(gradeId, [...s.invites, { n, exp }].slice(-5));
    const code = makeInviteCode(gradeId, n, exp);
    return Response.json({ ok: true, url: `${new URL(request.url).origin}/live/guest?c=${code}`, expiresAt: exp });
  } catch (e) { console.error("live invite", e); return jsonError("تعذر تجهيز دعوة الضيف.", 503); }
}
