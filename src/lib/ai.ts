// Shared free-AI helpers (Cloudflare Workers AI through the platform's worker). No keys in the client.
const ELLOOL_ORIGIN = "https://ellool-ai-studio.vercel.app";
export const STRONG_MODEL = process.env.SOLVER_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export const FALLBACK_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";

export function parseAI(raw: string) {
  try { const j = JSON.parse(raw); return (j?.choices?.[0]?.message?.content || "") as string; }
  catch { return raw.split("\n").filter(l => l.startsWith("data:") && !l.includes("[DONE]")).map(l => { try { return JSON.parse(l.slice(5).trim())?.choices?.[0]?.delta?.content || ""; } catch { return ""; } }).join(""); }
}
export async function workerPost(path: string, payload: unknown, ms: number) {
  const base = process.env.ELLOOL_AI_URL?.replace(/\/+$/, ""); if (!base) return null;
  const origin = process.env.ELLOOL_AI_ORIGIN || ELLOOL_ORIGIN;
  const headers: Record<string, string> = { "Content-Type": "application/json", Origin: origin, Referer: `${origin}/` };
  if (process.env.ELLOOL_AI_KEY) headers.Authorization = `Bearer ${process.env.ELLOOL_AI_KEY}`;
  return fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(ms) });
}
export async function chat(system: string, user: string, opts: { max?: number; temp?: number; ms?: number } = {}): Promise<string> {
  for (const model of [STRONG_MODEL, FALLBACK_MODEL]) {
    try {
      const r = await workerPost("/chat/completions", { model, messages: [{ role: "system", content: system }, { role: "user", content: user.slice(0, 6000) }], max_tokens: opts.max ?? 1500, temperature: opts.temp ?? 0.1, stream: false }, opts.ms ?? 40000);
      if (!r || !r.ok) continue;
      const t = parseAI(await r.text()).trim();
      if (t) return t;
    } catch { /* try the next model */ }
  }
  return "";
}

export const SOLVER_SYSTEM = `أنت «حلّال المسائل»، مدرس خبير يحل أي مسألة دراسية: رياضيات بكل فروعها (جبر، تحليل، نهايات، تفاضل وتكامل، متتاليات، أعداد عقدية، احتمالات، هندسة)، فيزياء، كيمياء، إحصاء، منطق، ومسائل كلامية.
قواعد الإجابة:
1. اكتب بلغة السؤال. لو السؤال بالعربية استخدم عربية بسيطة وواضحة تناسب طالب الثانوية.
2. ابدأ بسطر «المطلوب:» ثم «المعطيات:» لو في أرقام. حدد نوع المسألة وطريقة الحل قبل ما تبدأ.
3. احل خطوة بخطوة، كل خطوة في سطر قصير مرقم، واذكر القاعدة أو القانون المستخدم.
4. الحسابات: اكتب كل عملية حسابية بالتفصيل ولا تقفز فيها. للمسائل الطويلة جزّئ الحساب.
5. لعدد حلول معادلة: ادرس تغيّرات الدالة (المشتقة، القيم القصوى، الإشارات عندها) ولا تخمّن. للمتراجحات: جدول إشارات. للنهايات: حدد حالة عدم التعيين وأزلها.
6. اكتب الرياضيات كنص عادي بدون LaTeX: x^2 للقوة، sqrt(x) للجذر، a/b للكسر، pi، ∫ و lim و Σ مسموحة كرموز.
7. قبل النتيجة تحقق من الحل بطريقة مختلفة (تعويض أو تقدير عددي أو حالة خاصة) واكتب «التحقق:» في سطر.
8. اختم بسطر «الإجابة النهائية:» فيه النتيجة وحدها مع الوحدة إن وجدت.
9. لا تخترع أرقاماً أو معطيات. لو المسألة ناقصة قل بالضبط ما الناقص. لو غير متأكد من جزء قل ذلك صراحة.
10. التزم بإجابة مركزة (أقل من 400 كلمة).
11. لو الرسالة ليست مسألة تُحل (دردشة، طلب ضار، أو خارج الدراسة)، اعتذر بجملة واحدة وارجع لطلب مسألة.`;

const VERIFIER = `أنت مصحّح رياضيات صارم. ستُعطى مسألة وحلاً مقترحاً. لا تثق بالحل. أعد حل المسألة بنفسك بطريقة مختلفة (مثلاً: تعويض قيم، جدول إشارات أو تغيّرات، تحقق عددي، أو اختبار النتيجة في المعادلة الأصلية)، ثم قارن.
اكتب في آخر سطرين بالضبط:
الحكم: صحيح  أو  الحكم: خطأ
الإجابة الصحيحة: (النتيجة النهائية وحدها)`;

// Solve, then have a second pass re-solve independently. If it disagrees, rewrite the solution toward the checked answer.
export async function solveChecked(problem: string): Promise<{ answer: string; checked: boolean; corrected: boolean } | null> {
  const first = await chat(SOLVER_SYSTEM, problem, { max: 1500, ms: 45000 });
  if (!first) return null;
  const v = await chat(VERIFIER, `المسألة: ${problem}\n\nالحل المقترح:\n${first}`, { max: 1500, ms: 45000 });
  const verdict = /الحكم[:：]\s*(صحيح|خطأ)/.exec(v)?.[1];
  if (!verdict) return { answer: first, checked: false, corrected: false };
  if (verdict === "صحيح") return { answer: first, checked: true, corrected: false };
  const right = /الإجابة الصحيحة[:：]\s*([^\n]+)/.exec(v)?.[1]?.trim() || "";
  const fixed = await chat(SOLVER_SYSTEM, `${problem}\n\nتنبيه: المراجعة الدقيقة وجدت أن الحل التالي فيه خطأ، والنتيجة الأرجح هي: ${right}. أعد كتابة الحل الصحيح كاملاً خطوة بخطوة لتصل لنتيجة صحيحة (تأكد منها بنفسك، ولا تتبع التلميح لو لقيته غلط).\n\nالحل الخاطئ:\n${first.slice(0, 1500)}`, { max: 1500, ms: 45000 });
  return fixed ? { answer: fixed, checked: true, corrected: true } : { answer: first, checked: false, corrected: false };
}
