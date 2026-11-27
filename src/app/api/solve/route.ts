import { create, all } from "mathjs";
import { formatSolution, groundSolve } from "@/lib/ground-solve";
import { allowAttempt, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const ELLOOL_ORIGIN = "https://ellool-ai-studio.vercel.app";
const math = create(all, {});

const SOLVER_SYSTEM = `أنت «حلّال المسائل»، مدرس خبير يحل أي مسألة دراسية: رياضيات بكل فروعها، فيزياء، كيمياء، إحصاء، منطق، مسائل كلامية، وأساسيات البرمجة والحاسوب.
قواعد الإجابة:
1. اكتب بلغة السؤال. لو السؤال بالعربية استخدم عربية بسيطة وواضحة تناسب الطالب.
2. ابدأ بسطر «المطلوب:» تلخص فيه ما تطلبه المسألة، ثم «المعطيات:» لو في أرقام.
3. احل خطوة بخطوة، كل خطوة في سطر قصير مرقم، واذكر القاعدة أو القانون المستخدم باختصار.
4. اكتب الرياضيات كنص عادي بدون LaTeX: x^2 للقوة، sqrt(x) للجذر، a/b للكسر، pi، ∫ و lim و Σ مسموحة كرموز.
5. قبل النتيجة تحقق من الحل (بالتعويض أو بطريقة ثانية سريعة) واكتب «التحقق:» في سطر.
6. اختم بسطر «الإجابة النهائية:» فيه النتيجة وحدها مع الوحدة إن وجدت.
7. لا تخترع أرقاماً أو معطيات. لو المسألة ناقصة أو غير واضحة قل بالضبط ما الناقص واسأل عنه. لو لست متأكداً من جزء قل ذلك صراحة.
8. التزم بإجابة مختصرة ومركزة (أقل من 350 كلمة). لو المسألة طويلة جداً اشرح الفكرة والخطوات الأساسية.
9. لو الرسالة ليست مسألة تُحل (دردشة، طلب ضار، أو شيء خارج الدراسة)، اعتذر بجملة واحدة وارجع لطلب مسألة.`;

function parseAI(raw: string) {
  try { const j = JSON.parse(raw); return (j?.choices?.[0]?.message?.content || "") as string; }
  catch { return raw.split("\n").filter(l => l.startsWith("data:") && !l.includes("[DONE]")).map(l => { try { return JSON.parse(l.slice(5).trim())?.choices?.[0]?.delta?.content || ""; } catch { return ""; } }).join(""); }
}
const norm = (s: string) => s.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٫/g, ".").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/[−–—]/g, "-").replace(/\^/g, "^").trim();
// Pure arithmetic typed by the student is computed exactly, no AI needed.
function arithmetic(q: string): string | null {
  const e = norm(q).replace(/[=؟?]+$/, "").replace(/\s+/g, "");
  if (e.length < 3 || e.length > 120 || !/^[0-9+\-*/().^%,]+$/.test(e) || !/[+\-*/^%]/.test(e) || !/[0-9]/.test(e)) return null;
  try { const v = math.evaluate(e.replace(/,/g, "")); if (typeof v !== "number" || !Number.isFinite(v)) return null; const shown = Number.isInteger(v) ? String(v) : String(math.round(v, 10)); return `المطلوب: حساب ${e}\n\nالإجابة النهائية: ${shown}`; } catch { return null; }
}

async function workerPost(path: string, payload: unknown, ms: number) {
  const base = process.env.ELLOOL_AI_URL?.replace(/\/+$/, ""); if (!base) return null;
  const origin = process.env.ELLOOL_AI_ORIGIN || ELLOOL_ORIGIN;
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: origin, Referer: `${origin}/` };
  if (process.env.ELLOOL_AI_KEY) headers.Authorization = `Bearer ${process.env.ELLOOL_AI_KEY}`;
  return fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(ms) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const raw = await request.text();
  if (raw.length > 3_000_000) return jsonError("الصورة كبيرة جداً. صوّرها من أقرب أو صغّرها.", 413);
  let b: { question?: unknown; image?: unknown };
  try { b = JSON.parse(raw); } catch { return jsonError("طلب غير صالح."); }
  const question = typeof b.question === "string" ? b.question.trim().slice(0, 2000) : "";
  const image = typeof b.image === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(b.image) ? b.image : "";
  if (!question && !image) return jsonError("اكتب المسألة أو صوّرها.");
  if (question && question.length < 3 && !image) return jsonError("اكتب المسألة كاملة.");

  const user = await getCurrentUser();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const who = user ? `u:${user.id}` : `ip:${ip}`;
  if (!await allowAttempt(`solve:${who}`, user ? 30 : 12, 60 * 60 * 1000)) return jsonError("وصلت للحد المؤقت للأسئلة. ارجع بعد شوية.", 429);

  // Exact answers first: typed arithmetic and simple linear equations or 2x2 systems are computed, not guessed.
  if (!image) {
    const a = arithmetic(question); if (a) return Response.json({ answer: a, verified: true });
    const g = groundSolve(question); if (g && g.answers.length) return Response.json({ answer: formatSolution(g), verified: true });
  }
  if (!process.env.ELLOOL_AI_URL) return jsonError("الحلّال غير متاح الآن.", 503);
  if (image && !await allowAttempt(`solve-img:${who}`, user ? 10 : 5, 60 * 60 * 1000)) return jsonError("وصلت للحد المؤقت للصور. اكتب المسألة نصاً أو جرّب بعد شوية.", 429);
  // The whole free allowance is shared, so the solver has its own daily ceiling.
  if (!await allowAttempt("solve-global-day", 120, 24 * 60 * 60 * 1000)) return jsonError("الحلّال وصل للحد اليومي المجاني. جرّب بكرة بإذن الله.", 429);

  try {
    let problem = question; let transcript = "";
    if (image) {
      const r = await workerPost("/vision", { max_tokens: 500, messages: [{ role: "user", content: [
        { type: "text", text: "انسخ نص المسألة الموجودة في الصورة حرفياً كما هي، بما فيها الأرقام والرموز والأشكال المكتوبة (اكتب القوى x^2 والجذور sqrt()). لو في أكثر من سؤال انسخ الأول الواضح فقط. لا تحل المسألة ولا تضف أي شرح. لو لا توجد مسألة اكتب: لا توجد مسألة." },
        { type: "image_url", image_url: { url: image } }] }] }, 50000);
      if (!r || !r.ok) return jsonError("تعذر قراءة الصورة الآن. اكتب المسألة نصاً أو جرّب مرة ثانية.", 503);
      transcript = parseAI(await r.text()).trim();
      if (!transcript || /^لا توجد مسألة/.test(transcript)) return jsonError("ما لقيتش مسألة واضحة في الصورة. صوّرها أقرب وبإضاءة أحسن.", 422);
      problem = (question ? question + "\n" : "") + transcript;
    }
    const r = await workerPost("/chat/completions", { model: process.env.SOLVER_AI_MODEL || "@cf/meta/llama-4-scout-17b-16e-instruct", messages: [{ role: "system", content: SOLVER_SYSTEM }, { role: "user", content: problem.slice(0, 3000) }], max_tokens: 1100, temperature: 0.1, stream: false }, 55000);
    if (!r || !r.ok) { console.error("Solver AI error", r?.status); return jsonError("تعذر الحل الآن. جرّب مرة ثانية بعد شوية.", 503); }
    const answer = parseAI(await r.text()).trim();
    if (!answer) return jsonError("ما قدرتش أطلّع حل المرة دي. جرّب تعيد صياغة المسألة.", 503);
    return Response.json({ answer, verified: false, transcript: transcript || undefined });
  } catch (e) { console.error("Solver failed", e); return jsonError("حصل خطأ أثناء الحل. جرّب تاني.", 500); }
}
