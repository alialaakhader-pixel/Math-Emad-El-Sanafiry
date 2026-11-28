// Shared free-AI helpers (Cloudflare Workers AI through the platform's worker). No keys in the client.
import { runChecks, type Check } from "./verify";
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
      const payload = { model, messages: [{ role: "system", content: system }, { role: "user", content: user.slice(0, 6000) }], max_tokens: opts.max ?? 1500, temperature: opts.temp ?? 0.1, stream: false };
      let r = await workerPost("/chat/completions", payload, opts.ms ?? 40000);
      // The AI worker allows about 30 calls a minute. On a 429, wait and retry instead of failing the student.
      for (let i = 0; i < 3 && r && r.status === 429; i++) { await new Promise(res => setTimeout(res, 9000 + i * 6000)); r = await workerPost("/chat/completions", payload, opts.ms ?? 40000); }
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
11. استخدم رموز منهج الباكالوريا: f'(x)، ln، e^x، lim، ]a,b[ للمجالات، u_n للمتتاليات، z و |z| و arg(z) للأعداد العقدية، C(n,p) و A(n,p) للعد.
12. لو الرسالة ليست مسألة تُحل (دردشة، طلب ضار، أو خارج الدراسة)، اعتذر بجملة واحدة وارجع لطلب مسألة.`;

const VERIFIER = `أنت مصحّح رياضيات صارم. ستُعطى مسألة وحلاً مقترحاً. لا تثق بالحل. أعد حل المسألة بنفسك بطريقة مختلفة (مثلاً: تعويض قيم، جدول إشارات أو تغيّرات، تحقق عددي، أو اختبار النتيجة في المعادلة الأصلية)، ثم قارن.
اكتب في آخر سطرين بالضبط:
الحكم: صحيح  أو  الحكم: خطأ
الإجابة الصحيحة: (النتيجة النهائية وحدها)`;

const CHECKGEN = `أنت مولّد فحوصات حسابية. ستُعطى مسألة وحلاً. استخرج من النتائج النهائية في الحل فحوصاً رقمية يمكن لبرنامج mathjs تنفيذها. أجب بـ JSON فقط بدون أي نص: {"checks":[...]} وبحد أقصى 4 فحوص. الأنواع المسموحة (كل التعابير بصيغة mathjs: ^ للقوة، sqrt()، exp()، log() هو اللوغاريتم الطبيعي، pi، المتغير x ما لم يُذكر غيره):
{"kind":"derivative","f":"تعبير الدالة","claimed":"تعبير المشتقة الذي وصل له الحل"}
{"kind":"integral","f":"التعبير","a":"حد أدنى","b":"حد أعلى","claimed":"القيمة التي وصل لها الحل"}  (تكامل محدد فقط)
{"kind":"limit","f":"التعبير","point":"قيمة أو Infinity أو -Infinity","dir":"both|+|-","claimed":"النهاية أو Infinity أو -Infinity"}
{"kind":"roots","f":"تعبير الطرف الأيسر بعد نقل كل شيء له = 0","values":["جذر1","جذر2"]}  (جذور حقيقية فقط)
{"kind":"count_roots","f":"التعبير","lo":-50,"hi":50,"claimed":عدد_الجذور_الحقيقية}
{"kind":"eval","expr":"حساب يعيد نتيجة الحل بصيغة mathjs (مثل combinations(10,2)/combinations(15,2) أو det([[2,1],[5,3]]) أو sum عن طريق قيمة مباشرة)","claimed":"النتيجة التي وصل لها الحل"}
لا تكتب فحصاً لا تعرف تعبيره بدقة. لو لا يوجد ما يُفحص (برهان، شرح، مسألة فيزياء بدون معادلة واضحة) أعد {"checks":[]}.`;

async function computeChecks(problem: string, solution: string) {
  const raw = await chat(CHECKGEN, `المسألة: ${problem.slice(0, 1500)}\n\nالحل:\n${solution.slice(0, 2500)}`, { max: 700, temp: 0, ms: 30000 });
  const m = /\{[\s\S]*\}/.exec(raw); if (!m) return { passed: 0, failed: [] as string[] };
  try { const j = JSON.parse(m[0]); return runChecks(Array.isArray(j.checks) ? (j.checks as Check[]) : []); } catch { return { passed: 0, failed: [] as string[] }; }
}

// Solve, then re-solve independently and run real numeric checks (mathjs). Disagreement or a failed check triggers a corrected rewrite.
export async function solveChecked(problem: string): Promise<{ answer: string; checked: boolean; corrected: boolean; computed: number } | null> {
  const first = await chat(SOLVER_SYSTEM, problem, { max: 1500, ms: 45000 });
  if (!first) return null;
  const [v, calc] = await Promise.all([
    chat(VERIFIER, `المسألة: ${problem}\n\nالحل المقترح:\n${first}`, { max: 1500, ms: 45000 }),
    computeChecks(problem, first),
  ]);
  const verdict = /الحكم[:：]\s*(صحيح|خطأ)/.exec(v)?.[1];
  const right = /الإجابة الصحيحة[:：]\s*([^\n]+)/.exec(v)?.[1]?.trim() || "";
  const bad = calc.failed.length > 0 || verdict === "خطأ";
  if (!bad) return { answer: first, checked: !!verdict, corrected: false, computed: calc.passed };
  const hints = [calc.failed.length ? `نتائج حساب فعلي بالبرنامج (موثوقة أكثر من الحل): ${calc.failed.join(" | ")}` : "", verdict === "خطأ" && right ? `المراجعة المستقلة رجّحت أن النتيجة: ${right}` : ""].filter(Boolean).join("\n");
  const fixed = await chat(SOLVER_SYSTEM, `${problem}\n\nتنبيه: الحل التالي فيه خطأ على الأرجح.\n${hints}\nأعد كتابة الحل الصحيح كاملاً خطوة بخطوة، وتأكد من نتيجتك بنفسك (ولا تتبع التلميح لو لقيته غلط).\n\nالحل الخاطئ:\n${first.slice(0, 1500)}`, { max: 1500, ms: 45000 });
  return fixed ? { answer: fixed, checked: true, corrected: true, computed: 0 } : { answer: first, checked: false, corrected: false, computed: calc.passed };
}
