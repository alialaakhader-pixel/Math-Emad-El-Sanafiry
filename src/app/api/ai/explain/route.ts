import { getCurrentUser, jsonError, sameOrigin, allowAttempt } from "@/lib/auth";
import { pool } from "@/db";
import { chat } from "@/lib/ai";
import { cacheGet, cacheSet } from "@/lib/aicache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const SYS = `أنت مدرس رياضيات صبور. اشرح لطالب ثانوي ليه الإجابة الصحيحة صحيحة، وفين الغلطة الشائعة اللي بتخلي الطالب يختار إجابة غلط. بعربية بسيطة وخطوات قصيرة مرقمة، بدون LaTeX (استخدم x^2 و sqrt(x) و a/b). اختم بسطر «نصيحة:» قصير. لا تزيد عن 120 كلمة.`;

// Explanation of a question the student answered wrong. Cached per question, so each question costs one AI call ever.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError("طلب غير مسموح.", 403);
  const user = await getCurrentUser();
  if (!user || user.role !== "student") return jsonError("سجّل دخولك أولاً.", 401);
  let b: { key?: string; chosen?: number };
  try { b = await request.json(); } catch { return jsonError("طلب غير صالح."); }
  const key = typeof b.key === "string" ? b.key : "";
  const m = /^([ep]):([\w-]{1,40})$/.exec(key); if (!m || (m[1] === "e" && !/^[0-9a-f-]{36}$/i.test(m[2]))) return jsonError("طلب غير صالح.");
  let q: { text: string; options: string[]; correct: number; why?: string } | null = null;
  if (m[1] === "p") {
    const r = (await pool.query("select q, options, correct, why from practice_questions where id=$1", [m[2]])).rows[0];
    if (r) q = { text: r.q, options: r.options, correct: r.correct, why: r.why };
  } else {
    const r = (await pool.query("select q.prompt, q.options, q.correct_index from questions q where q.id=$1 and q.kind='mcq' and exists (select 1 from attempt_answers aa join exam_attempts a on a.id=aa.attempt_id where a.user_id=$2 and aa.question_id=q.id)", [m[2], user.id])).rows[0];
    if (r) q = { text: r.prompt, options: r.options, correct: r.correct_index };
  }
  if (!q) return jsonError("السؤال مش موجود.", 404);
  const ck = "explain:" + key;
  const hit = await cacheGet(ck); if (hit) return Response.json({ text: hit, cached: true });
  if (!await allowAttempt("explain-global-day", 300, 24 * 60 * 60 * 1000)) return jsonError("الشرح الآلي وصل للحد اليومي المجاني. جرّب بكرة.", 429);
  const opts = q.options.map((o, i) => `${i + 1}) ${o}`).join("\n");
  const text = await chat(SYS, `السؤال: ${q.text}\nالخيارات:\n${opts}\nالإجابة الصحيحة: ${q.correct + 1}) ${q.options[q.correct]}${q.why ? `\nملاحظة المدرس: ${q.why}` : ""}`, { max: 500, temp: 0.2, ms: 40000, cheap: true });
  if (!text) return jsonError("مقدرتش أشرح دلوقتي. جرّب بعد شوية.", 503);
  await cacheSet(ck, text);
  return Response.json({ text, cached: false });
}
