import { allowAttempt, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const ELLOOL_ORIGIN = "https://ellool-ai-studio.vercel.app";
const SIZES: Record<string, [number, number]> = { portrait: [768, 1024], square: [1024, 1024], wide: [1024, 768] };

async function workerPost(path: string, payload: unknown, ms: number) {
  const base = process.env.ELLOOL_AI_URL?.replace(/\/+$/, ""); if (!base) return null;
  const origin = process.env.ELLOOL_AI_ORIGIN || ELLOOL_ORIGIN;
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: origin, Referer: `${origin}/` };
  if (process.env.ELLOOL_AI_KEY) headers.Authorization = `Bearer ${process.env.ELLOOL_AI_KEY}`;
  return fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(ms) });
}

// The image model understands English best. Arabic prompts are translated first (small, cheap call); on any failure the original is used.
async function toEnglish(text: string): Promise<string> {
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  try {
    const r = await workerPost("/chat/completions", { model: "@cf/meta/llama-4-scout-17b-16e-instruct", max_tokens: 300, temperature: 0.2, messages: [
      { role: "system", content: "Translate the user's Arabic image description into one clear English image-generation prompt. Keep every detail. Output only the English prompt." },
      { role: "user", content: text }] }, 20000);
    if (!r || !r.ok) return text;
    const j = JSON.parse(await r.text()); const out = String(j?.choices?.[0]?.message?.content || "").trim();
    return out && out.length < 1500 ? out : text;
  } catch { return text; }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("سجّل دخولك الأول عشان تستخدم استوديو الصور.", 401);
  const raw = await request.text();
  if (raw.length > 2_500_000) return jsonError("الصورة كبيرة جداً. جرّب صورة أصغر.", 413);
  let b: { prompt?: unknown; face?: unknown; size?: unknown };
  try { b = JSON.parse(raw); } catch { return jsonError("طلب غير صالح."); }
  const prompt = typeof b.prompt === "string" ? b.prompt.trim().slice(0, 900) : "";
  if (prompt.length < 4) return jsonError("اكتب وصف الصورة اللي عايزها (4 حروف على الأقل).");
  const face = typeof b.face === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.face) ? b.face : "";
  const [w, h] = SIZES[String(b.size)] || SIZES.portrait;
  if (!process.env.ELLOOL_AI_URL) return jsonError("استوديو الصور غير متاح الآن.", 503);

  const perDay = user.role === "teacher" ? 20 : 6;
  if (!await allowAttempt(`imagine:${user.id}`, perDay, 24 * 60 * 60 * 1000)) return jsonError(`وصلت للحد اليومي (${perDay} صور). ارجع بكرة بإذن الله.`, 429);
  if (!await allowAttempt("imagine-global-day", 50, 24 * 60 * 60 * 1000)) return jsonError("الاستوديو وصل للحد اليومي المجاني. جرّب بكرة بإذن الله.", 429);

  try {
    let en = await toEnglish(prompt);
    en += face
      ? ". The main person is the man in the reference photo: keep his exact face, glasses, beard and skin tone, recognisable. Professional, polished, high quality. Do not write any text, letters or numbers in the image."
      : ". Professional, polished, high quality. Do not write any text, letters or numbers in the image.";
    const r = await workerPost("/images/generations", { prompt: en, width: w, height: h, imageData: face || undefined }, 55000);
    if (!r) return jsonError("استوديو الصور غير متاح الآن.", 503);
    const d = await r.json().catch(() => ({} as { image?: string; error?: { message?: string } }));
    if (!r.ok || !d.image) return jsonError(d?.error?.message || "تعذر توليد الصورة الآن. جرّب وصف تاني بعد شوية.", r.status === 429 ? 429 : 503);
    return Response.json({ image: d.image, width: d.width || w, height: d.height || h });
  } catch { return jsonError("الصورة أخذت وقت أطول من المتوقع. جرّب تاني.", 504); }
}
