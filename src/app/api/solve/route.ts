import { create, all } from "mathjs";
import { formatSolution, groundSolve } from "@/lib/ground-solve";
import { parseAI, solveChecked, workerPost } from "@/lib/ai";
import { allowAttempt, getCurrentUser, jsonError, sameOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const math = create(all, {});

const norm = (s: string) => s.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/٫/g, ".").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/[−–—]/g, "-").replace(/\^/g, "^").trim();
// Pure arithmetic typed by the student is computed exactly, no AI needed.
function arithmetic(q: string): string | null {
  const e = norm(q).replace(/[=؟?]+$/, "").replace(/\s+/g, "");
  if (e.length < 3 || e.length > 120 || !/^[0-9+\-*/().^%,]+$/.test(e) || !/[+\-*/^%]/.test(e) || !/[0-9]/.test(e)) return null;
  try { const v = math.evaluate(e.replace(/,/g, "")); if (typeof v !== "number" || !Number.isFinite(v)) return null; const shown = Number.isInteger(v) ? String(v) : String(math.round(v, 10)); return `المطلوب: حساب ${e}\n\nالإجابة النهائية: ${shown}`; } catch { return null; }
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
    const out = await solveChecked(problem.slice(0, 3000));
    if (!out || !out.answer) return jsonError("تعذر الحل الآن. جرّب مرة ثانية بعد شوية.", 503);
    return Response.json({ answer: out.answer, verified: false, checked: out.checked, corrected: out.corrected, computed: out.computed, transcript: transcript || undefined });
  } catch (e) { console.error("Solver failed", e); return jsonError("حصل خطأ أثناء الحل. جرّب تاني.", 500); }
}
