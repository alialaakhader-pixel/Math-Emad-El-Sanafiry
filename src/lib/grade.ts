import { pool } from "@/db";
import { allowAttempt } from "@/lib/auth";
import { chat, solveChecked } from "@/lib/ai";
import { casSolve } from "@/lib/cas";
import { casSolve2 } from "@/lib/cas2";
import { groundSolve, formatSolution } from "@/lib/ground-solve";
import { cacheGet, cacheSet } from "@/lib/aicache";

const AR = "٠١٢٣٤٥٦٧٨٩";
const nums = (t: string) => (t.replace(/[٠-٩]/g, d => String(AR.indexOf(d))).replace(/٫/g, ".").replace(/[\u202A-\u202E\u2066-\u2069]/g, "").match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || []).map(x => { try { return x.includes("/") ? Number(x.split("/")[0]) / Number(x.split("/")[1]) : Number(x); } catch { return NaN; } }).filter(Number.isFinite);
// Reference answers that code computed exactly (no AI call). Returns the text plus its final numbers.
function codeReference(prompt: string): { text: string; finals: number[] } | null {
  let text: string | null = null;
  try { text = casSolve(prompt) ?? casSolve2(prompt); } catch { /* fall through */ }
  if (!text) { try { const g = groundSolve(prompt); if (g && g.answers.length) text = formatSolution(g); } catch { /* none */ } }
  if (!text) return null;
  const tail = text.split("الحل النهائي").pop() || "";
  const finals = nums(tail); return finals.length ? { text, finals } : null;
}

export const AI_TAG = "🤖 تصحيح الذكاء الاصطناعي: ";
const GRADER = `أنت مصحّح امتحانات رياضيات عادل ومحدد. ستُعطى: السؤال، حلاً مرجعياً (تم حله ومراجعته)، وإجابة الطالب، والدرجة الكاملة.
قواعد التصحيح:
- لو الإجابة النهائية صحيحة والخطوات منطقية: الدرجة كاملة.
- لو الطريقة صحيحة وفيها خطأ حسابي بسيط: درجة جزئية (حوالي 50 إلى 75 بالمئة).
- لو فيه جزء صحيح فقط من المطلوب: درجة تناسب هذا الجزء.
- لو الإجابة فاضية أو بلا علاقة أو خاطئة تماماً: صفر.
- اقبل أي طريقة حل صحيحة حتى لو اختلفت عن المرجع. لا تعاقب على صياغة أو إملاء.
- لو الحل المرجعي نفسه يبدو غير موثوق، أعطِ الطالب الفرصة لو حله منطقي.
أجب بسطر JSON واحد فقط بدون أي نص آخر:
{"score": رقم صحيح بين 0 والدرجة الكاملة, "feedback": "تعليق قصير بالعربية تخاطب فيه الطالب مباشرة بصيغة المخاطب (جملة أو جملتين) يوضح الصح والغلط وإزاي يصلحه"}`;

export async function gradeEssay(prompt: string, answer: string, points: number): Promise<{ score: number; feedback: string } | null> {
  if (!answer.trim() || answer.startsWith("file:")) return null;
  if (!await allowAttempt("grade-global-day", 400, 24 * 60 * 60 * 1000)) return null;
  // 1) reference computed by code: no AI call, and a matching final answer gets full marks without the AI grader.
  const code = codeReference(prompt);
  if (code) {
    const mine = nums(answer);
    if (code.finals.length <= 4 && code.finals.every(f => mine.some(v => Math.abs(v - f) <= 1e-6 * Math.max(1, Math.abs(f))))) return { score: points, feedback: "إجابتك النهائية صحيحة ومطابقة للحل المحسوب. ممتاز." };
  }
  // 2) otherwise one cached reference per question, so the solver runs once per question.
  const rkey = "ref:" + prompt.slice(0, 2500).replace(/\s+/g, " ").toLowerCase();
  let refText = code?.text || await cacheGet(rkey, 24 * 90).catch(() => null);
  if (!refText) { const ref = await solveChecked(prompt.slice(0, 2500)); refText = ref?.answer || null; if (ref?.answer && ref.checked) await cacheSet(rkey, ref.answer).catch(() => {}); }
  const ref = { answer: refText };
  const raw = await chat(GRADER, `السؤال:\n${prompt.slice(0, 2500)}\n\nالحل المرجعي:\n${(ref?.answer || "لا يوجد حل مرجعي").slice(0, 2500)}\n\nإجابة الطالب:\n${answer.slice(0, 3000)}\n\nالدرجة الكاملة: ${points}`, { max: 400, temp: 0, ms: 40000 });
  const m = /\{[\s\S]*\}/.exec(raw); if (!m) return null;
  try {
    const j = JSON.parse(m[0]); const n = Number(j.score);
    if (!Number.isFinite(n) || typeof j.feedback !== "string") return null;
    return { score: Math.max(0, Math.min(points, Math.round(n))), feedback: j.feedback.trim().slice(0, 600) };
  } catch { return null; }
}

// Grades every ungraded typed answer of an attempt. Anything the AI can't grade stays for the teacher.
export async function aiGradeAttempt(attemptId: string) {
  const { rows } = await pool.query("select aa.id, aa.value, q.prompt, q.points from attempt_answers aa join questions q on q.id=aa.question_id where aa.attempt_id=$1 and q.kind='text' and aa.awarded is null", [attemptId]);
  for (const r of rows) {
    try {
      const g = await gradeEssay(r.prompt, r.value, r.points);
      if (g) await pool.query("update attempt_answers set awarded=$2, feedback=$3 where id=$1 and awarded is null", [r.id, g.score, AI_TAG + g.feedback]);
    } catch (e) { console.error("AI grading failed", e); }
  }
  const all = await pool.query("select awarded from attempt_answers where attempt_id=$1", [attemptId]);
  const score = all.rows.reduce((s, a) => s + (a.awarded || 0), 0);
  await pool.query("update exam_attempts set score=$2, status=$3 where id=$1 and status='pending_review'", [attemptId, score, all.rows.every(a => a.awarded !== null) ? "graded" : "pending_review"]);
}
