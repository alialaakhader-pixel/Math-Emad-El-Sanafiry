import { allowAttempt, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
// Push-to-talk speech to text through the Ellool worker (Workers AI Whisper). Off until TUTOR_VOICE=1 and the updated worker is deployed.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل الدخول أولاً.", 401);
  const base = process.env.ELLOOL_AI_URL?.replace(/\/+$/, "");
  if (process.env.TUTOR_VOICE !== "1" || !base) return jsonError("السؤال بالصوت لسه مش متفعّل.", 503);
  if (!await allowAttempt(`assistant:${user.id}`, 25, 60 * 60 * 1000)) return jsonError("وصلت إلى الحد المؤقت. حاول لاحقاً.", 429);
  const { audio } = await request.json().catch(() => ({}));
  if (typeof audio !== "string" || audio.length < 200 || audio.length > 4_000_000) return jsonError("سجّل سؤالاً أقصر.");
  const origin = process.env.ELLOOL_AI_ORIGIN || "https://ellool-ai-studio.vercel.app";
  try {
    const r = await fetch(`${base}/transcribe`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Referer: `${origin}/` }, body: JSON.stringify({ audio }), signal: AbortSignal.timeout(40000) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.text) return jsonError(d?.error?.message || "تعذر فهم التسجيل.", r.status === 422 ? 422 : 503);
    return Response.json({ text: String(d.text).slice(0, 600) });
  } catch { return jsonError("تعذر الاتصال بخدمة الصوت.", 503); }
}
