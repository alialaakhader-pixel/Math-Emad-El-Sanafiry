import { allowAttempt, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const ELLOOL_ORIGIN = "https://ellool-ai-studio.vercel.app";

// OpenAI-compatible vision proxy used by the calculator's camera scanner.
// Backends, in order: a Groq key if one is configured, otherwise the Ellool AI worker's /vision route.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك أولاً لتستخدم ماسح الكاميرا.", 401);
  if (!await allowAttempt(`vision:${user.id}`, 20, 60 * 60 * 1000)) return jsonError("وصلت للحد المؤقت لماسح الكاميرا. حاول لاحقاً.", 429);
  const raw = await request.text();
  if (raw.length > 6_500_000) return jsonError("الصورة كبيرة جداً.", 413);
  let body: { messages?: unknown; max_tokens?: number; model?: string };
  try { body = JSON.parse(raw); } catch { return jsonError("طلب غير صالح."); }
  const messages = body.messages;
  const groq = process.env.GROQ_API_KEY?.trim();
  const worker = process.env.ELLOOL_AI_URL?.replace(/\/+$/, "");
  try {
    if (groq) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${groq}` }, body: JSON.stringify({ model: process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct", messages, max_tokens: Math.min(Number(body.max_tokens) || 600, 900), temperature: 0.1 }), signal: AbortSignal.timeout(45000) });
      const text = await r.text();
      return new Response(text, { status: r.status, headers: { "Content-Type": "application/json" } });
    }
    if (worker) {
      const origin = process.env.ELLOOL_AI_ORIGIN || ELLOOL_ORIGIN;
      const r = await fetch(`${worker}/vision`, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Referer: `${origin}/` }, body: JSON.stringify({ messages, max_tokens: body.max_tokens }), signal: AbortSignal.timeout(50000) });
      if (r.ok) return new Response(await r.text(), { status: 200, headers: { "Content-Type": "application/json" } });
      if (r.status === 404) return jsonError("قراءة الصور لم تُفعَّل بعد على خدمة Ellool AI.", 503);
      return jsonError("تعذر قراءة الصورة الآن. حاول مرة أخرى.", 503);
    }
    return jsonError("ماسح الكاميرا غير متاح حالياً.", 503);
  } catch { return jsonError("تعذر قراءة الصورة الآن. حاول مرة أخرى.", 503); }
}
