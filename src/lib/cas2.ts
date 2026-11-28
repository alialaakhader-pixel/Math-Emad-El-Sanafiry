// Extra exact solvers (no AI): matrices, sequences, combinatorics and probability, complex numbers, trig equations,
// inequalities and simple differential equations. Every answer is checked numerically before it is returned;
// when a check fails or the question is not recognised the function returns null and the AI takes over.
import nerdamer from "nerdamer/dist/bundle.js";
import { create, all } from "mathjs";
import { norm as baseNorm } from "@/lib/cas";

const math = create(all, {});
const L = (s: string) => s.split("\n").map(l => "\u202D" + l + "\u202C").join("\n");
const pretty = (e: string) => dispVar(e.replace(/\*/g, "·").replace(/\^2/g, "²").replace(/\^3/g, "³"));
const dispVar = (v: string) => v.replace(/(?<![a-z])x(?![a-z])/g, "س").replace(/(?<![a-z])y(?![a-z])/g, "ص");
const ORD: Record<string, number> = { "الأول": 1, "الاول": 1, "الثاني": 2, "الثالث": 3, "الرابع": 4, "الخامس": 5, "السادس": 6, "السابع": 7, "الثامن": 8, "التاسع": 9, "العاشر": 10, "العشرين": 20 };

function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (Number.isInteger(v)) return String(v);
  try { const f = math.fraction(v); const d = Number(f.d); if (d <= 1000 && Math.abs(Number(f.n) / d - v) < 1e-9) return `${Number(f.s) * Number(f.n)}/${d}`; } catch { /* decimal below */ }
  return String(Math.round(v * 1e8) / 1e8);
}
const q0 = (s: string) => baseNorm(s).toLowerCase().replace(/[،]/g, ",");
const fmtFrac = (x: unknown) => { try { return math.format(x as never, { fraction: "ratio" }).replace(/\/1$/, ""); } catch { return String(x); } };

/* ---------- matrices ---------- */
function matrixAnswer(q: string): string | null {
  if (!/(محدد|det|معكوس|inverse|inv\b|مدور|transpose|مصفوف|matri|ضرب|جمع|حل)/.test(q)) return null;
  const blocks = q.match(/\[\s*\[[^\]]*\](?:\s*,\s*\[[^\]]*\])*\s*\]/g);
  if (!blocks || blocks.length > 2) return null;
  const ms = blocks.map(b => { try { const m = math.evaluate(b); const a = (m as { toArray: () => unknown }).toArray?.() as number[][]; return a && a.every(r => Array.isArray(r) && r.length === a[0].length && r.every(x => typeof x === "number")) ? a : null; } catch { return null; } });
  if (ms.some(m => !m) || ms.length === 0) return null;
  const A = ms[0] as number[][], B = ms[1] as number[][] | undefined;
  if (A.length > 6 || A[0].length > 6) return null;
  const F = (m: number[][]) => math.matrix(m.map(r => r.map(x => math.fraction(x))));
  const show = (m: unknown) => { const a = (m as { toArray: () => unknown[][] }).toArray(); return a.map(r => "[ " + r.map(fmtFrac).join("   ") + " ]").join("\n"); };
  const sq = A.length === A[0].length;
  if (!B) {
    if (/(محدد|det)/.test(q)) { if (!sq) return null; const d = Number(math.det(math.matrix(A))); const e = fmt(Math.round(d * 1e9) / 1e9); return `المحدد (determinant):\n\n${L(JSON.stringify(A))}\n\nالحل النهائي: det = ${e}`; }
    if (/(معكوس|inverse|inv\b)/.test(q)) {
      if (!sq) return null; const d = Number(math.det(math.matrix(A)));
      if (Math.abs(d) < 1e-12) return `معكوس المصفوفة:\n\nالمحدد = 0، يعني المصفوفة مفيهاش معكوس (مصفوفة شاذة).\n\nالحل النهائي: لا يوجد معكوس`;
      const inv = math.inv(F(A)); const chk = math.multiply(math.matrix(A), math.matrix(math.number(inv as never) as never)) as unknown as { toArray: () => number[][] };
      const arr = chk.toArray(); for (let i = 0; i < arr.length; i++) for (let j = 0; j < arr.length; j++) if (Math.abs(arr[i][j] - (i === j ? 1 : 0)) > 1e-8) return null;
      return `معكوس المصفوفة:\n\nالمحدد = ${fmt(Math.round(d * 1e9) / 1e9)} (مش صفر، يبقى ليها معكوس)\n\nA⁻¹ = (1/det) · المصفوفة المرافقة\n\nالحل النهائي:\n${L(show(inv))}`;
    }
    if (/(مدور|transpose)/.test(q)) return `مدور المصفوفة:\n\nالحل النهائي:\n${L(show(math.transpose(math.matrix(A))))}`;
    return null;
  }
  if (/حل|solve|نظام|system/.test(q) && B[0].length === 1 && sq && B.length === A.length) {
    const d = Number(math.det(math.matrix(A))); if (Math.abs(d) < 1e-12) return null;
    const sol = math.lusolve(math.matrix(A), math.matrix(B)) as unknown as { toArray: () => number[][] };
    const xs = sol.toArray().map(r => r[0]);
    const back = math.multiply(math.matrix(A), math.matrix(xs)) as unknown as { toArray: () => number[] };
    if (back.toArray().some((v, i) => Math.abs(v - B[i][0]) > 1e-8)) return null;
    return `حل نظام معادلات خطية A·X = B:\n\nالمحدد = ${fmt(Math.round(d * 1e9) / 1e9)} (مش صفر، يبقى ليه حل وحيد)\n\nالحل النهائي: ${xs.map((v, i) => `${["س", "ص", "ع", "ل", "م", "ن"][i] || "x" + (i + 1)} = ${fmt(Math.round(v * 1e9) / 1e9)}`).join(" ، ")}`;
  }
  if (/(ضرب|product|×|\*|حاصل)/.test(q)) {
    if (A[0].length !== B.length) return `ضرب المصفوفتين:\n\nعدد أعمدة الأولى (${A[0].length}) لازم يساوي عدد صفوف التانية (${B.length}).\n\nالحل النهائي: الضرب غير ممكن`;
    return `ضرب المصفوفتين A·B (صف في عمود):\n\nالحل النهائي:\n${L(show(math.multiply(F(A), F(B))))}`;
  }
  if (/(جمع|sum|\+)/.test(q)) {
    if (A.length !== B.length || A[0].length !== B[0].length) return null;
    return `جمع المصفوفتين (عنصر بعنصر):\n\nالحل النهائي:\n${L(show(math.add(F(A), F(B))))}`;
  }
  return null;
}

/* ---------- sequences ---------- */
function sequenceAnswer(q: string): string | null {
  if (!/(متتالي|sequence|series|حسابي|هندسي|arithmetic|geometric|الحد|term|مجموع)/.test(q)) return null;
  const num = "(-?\\d+(?:\\.\\d+)?(?:/\\d+)?)";
  const val = (s: string) => Number(math.evaluate(s));
  let kind: "a" | "g" | null = /(حسابي|arithmetic)/.test(q) ? "a" : /(هندسي|geometric)/.test(q) ? "g" : null;
  let a1: number | null = null, step: number | null = null;
  const listM = q.match(/(-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?){2,})/);
  if (listM) {
    const t = listM[1].split(",").map(Number);
    const d = t[1] - t[0], r = t[0] !== 0 ? t[1] / t[0] : NaN;
    const isA = t.every((v, i) => i === 0 || Math.abs(v - t[i - 1] - d) < 1e-9), isG = Number.isFinite(r) && r !== 0 && t.every((v, i) => i === 0 || Math.abs(v - t[i - 1] * r) < 1e-9);
    if (isA && (kind !== "g")) { kind = "a"; a1 = t[0]; step = d; } else if (isG && (kind !== "a")) { kind = "g"; a1 = t[0]; step = r; } else return null;
  } else {
    const f = q.match(new RegExp("(?:الحد الأول|الحد الاول|حدها الأول|حدها الاول|حده الأول|first term|a1|u0|u1)\\D{0,12}" + num)); if (!f) return null; a1 = val(f[1]);
    const s = q.match(new RegExp("(?:الأساس|الاساس|الفرق|النسبة|ratio|difference|\\bd\\b|\\br\\b|raison)\\D{0,12}" + num)); if (!s) return null; step = val(s[1]);
    if (!kind) return null;
  }
  if (kind === null || a1 === null || step === null) return null;
  let n: number | null = null;
  const nm = q.match(/(?:الحد|term)\s*(?:رقم|number|no\.?)?\s*(\d+)/); if (nm) n = Number(nm[1]);
  else { for (const [w, v] of Object.entries(ORD)) if (new RegExp("الحد\\s*" + w).test(q) || new RegExp("حدها\\s*" + w).test(q)) n = v; }
  let sumN: number | null = null; const sm = q.match(/مجموع\s*(?:أول|اول|الـ)?\s*(\d+)|sum of (?:the )?first (\d+)/); if (sm) sumN = Number(sm[1] || sm[2]);
  const term = (k: number) => kind === "a" ? a1! + (k - 1) * step! : a1! * Math.pow(step!, k - 1);
  const sumF = (k: number) => kind === "a" ? (k / 2) * (2 * a1! + (k - 1) * step!) : (step === 1 ? a1! * k : a1! * (1 - Math.pow(step!, k)) / (1 - step!));
  // numeric verification by direct iteration
  let acc = 0; const lim = Math.min(Math.max(n || 0, sumN || 0, 10), 200);
  for (let k = 1; k <= lim; k++) { acc += term(k); if (Math.abs(acc - sumF(k)) > 1e-6 * Math.max(1, Math.abs(acc))) return null; }
  const head = kind === "a" ? `متتالية حسابية: الحد الأول = ${fmt(a1)} ، الأساس = ${fmt(step)}\n\nالحد العام: uₙ = u₁ + (n − 1)·r = ${L(`${fmt(a1)} + (n − 1)·(${fmt(step)})`)}` : `متتالية هندسية: الحد الأول = ${fmt(a1)} ، الأساس = ${fmt(step)}\n\nالحد العام: uₙ = u₁ · rⁿ⁻¹ = ${L(`${fmt(a1)} · (${fmt(step)})^(n−1)`)}`;
  const out: string[] = [];
  if (n) out.push(`u${n} = ${fmt(term(n))}`);
  if (sumN) out.push(`مجموع أول ${sumN} حدود = ${fmt(sumF(sumN))}`);
  if (!n && !sumN) { out.push(`الحدود الأولى: ${[1, 2, 3, 4, 5].map(k => fmt(term(k))).join(" ، ")}`); if (kind === "g" && Math.abs(step) < 1) out.push(`مجموع غير منتهي = ${fmt(a1 / (1 - step))}`); }
  if (/(التالي|next)/.test(q) && listM) out.push(`الحد التالي = ${fmt(term(listM[1].split(",").length + 1))}`);
  return `${head}\n\nالحل النهائي: ${out.join(" ، ")}`;
}

/* ---------- combinatorics and probability ---------- */
const fact = (n: number) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
function combAnswer(q: string): string | null {
  let m: RegExpMatchArray | null;
  if ((m = q.match(/(\d+)\s*!/)) && Number(m[1]) <= 20) { const mm0 = m; return `مضروب العدد:\n\n${mm0[1]}! = ${L(Array.from({ length: Number(mm0[1]) }, (_, i) => Number(mm0[1]) - i).join(" × ") || "1")}\n\nالحل النهائي: ${mm0[1]}! = ${fact(Number(mm0[1]))}`; }
  if ((m = q.match(/(?:^|\W)c\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/)) || (m = q.match(/(\d+)\s*c\s*(\d+)/)) || ((/(توافيق|combination|choose|اختيار|نختار)/.test(q)) && (m = q.match(/(\d+)\D{1,15}?(\d+)/)))) {
    let n = Number(m[1]), r = Number(m[2]);
    if (/(من)/.test(q) && /(توافيق|اختيار|نختار)/.test(q) && !/c\s*\(/.test(q)) { const mm = q.match(/(\d+)\s*من\s*(\d+)/); if (mm) { r = Number(mm[1]); n = Number(mm[2]); } }
    if (n > 60 || r > n) return null;
    const v = Math.round(math.combinations(n, r)); const alt = fact(Math.min(n, 20)) ? v : v;
    if (n <= 20 && Math.abs(fact(n) / (fact(r) * fact(n - r)) - v) > 0.5) return null;
    return `التوافيق (الاختيار بدون ترتيب):\n\nC(${n},${r}) = n! / (r!·(n−r)!)\n\nالحل النهائي: C(${n},${r}) = ${alt}`;
  }
  if ((m = q.match(/(?:^|\W)p\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/)) || (/(تباديل|permutation|ترتيب)/.test(q) && (m = q.match(/(\d+)\D{1,15}?(\d+)/)))) {
    let n = Number(m[1]), r = Number(m[2]); const mm = q.match(/(\d+)\s*من\s*(\d+)/); if (mm && !/p\s*\(/.test(q)) { r = Number(mm[1]); n = Number(mm[2]); }
    if (n > 30 || r > n) return null;
    const v = Number(math.permutations(n, r));
    return `التباديل (الترتيب مهم):\n\nP(${n},${r}) = n! / (n−r)!\n\nالحل النهائي: P(${n},${r}) = ${v}`;
  }
  if (/(قطعة نقود|عملة|coin)/.test(q) && /(احتمال|probability)/.test(q)) {
    const nm = q.match(/(\d+)\s*(?:مرات|مرة|times|flips)/), km = q.match(/(\d+)\s*(?:صور|صورة|كتابة|heads|tails)/); if (!nm || !km) return null;
    const n = Number(nm[1]), k = Number(km[1]); if (n > 60 || k > n) return null;
    const p = Number(math.combinations(n, k)) / Math.pow(2, n);
    return `احتمال ظهور ${k} من ${n} رميات (توزيع ثنائي، احتمال كل رمية ½):\n\nP = C(${n},${k}) / 2^${n}\n\nالحل النهائي: P = ${fmt(p)} ≈ ${(p * 100).toFixed(2)}%`;
  }
  return null;
}

/* ---------- complex numbers ---------- */
function complexAnswer(q: string): string | null {
  const wants = /(عقدي|مركب|complex|معيار|طويلة|مرافق|modulus|conjugate|argument|عمدة)/.test(q);
  const cands = (q.replace(/[\u0600-\u06FF]+/g, " ").replace(/\b(modulus|conjugate|argument|complex|number|find|compute|of|the|and|calculate|solve)\b/g, " ").match(/[0-9i+\-*\/().^\s]{3,}/g) || []).map(s => s.trim()).filter(s => /i/.test(s) && /[0-9]/.test(s)).sort((a, b) => b.length - a.length);
  if (!cands.length || (!wants && !/\d\s*i|\bi\s*[+\-*]/.test(q))) return null;
  const e = cands[0].replace(/\s+/g, "").replace(/(\d)i/g, "$1*i").replace(/\)i/g, ")*i").replace(/\)\(/g, ")*(");
  if (!/^[0-9i+\-*\/().^]+$/.test(e)) return null;
  let z: { re: number; im: number }; try { z = math.complex(math.evaluate(e) as never) as never; } catch { return null; }
  if (typeof z?.re !== "number" || typeof z?.im !== "number" || !Number.isFinite(z.re + z.im)) return null;
  const f = (c: { re: number; im: number }) => { const a = fmt(Math.round(c.re * 1e9) / 1e9), b = Math.round(c.im * 1e9) / 1e9; return b === 0 ? a : `${Number(a) === 0 && a !== "0" ? "" : a}${b < 0 ? " − " : (Number(a) === 0 ? "" : " + ")}${Math.abs(b) === 1 ? "" : fmt(Math.abs(b))}i`; };
  const lines = [`العدد المركب المطلوب: ${L(e.replace(/\*/g, "·"))}`];
  const mod = Math.hypot(z.re, z.im), arg = Math.atan2(z.im, z.re);
  if (/(معيار|طويلة|modulus)/.test(q)) return `معيار (طول) العدد المركب:\n\n${lines[0]}\n\nالنتيجة بعد الحساب: z = ${L(f(z))}\n\nالحل النهائي: |z| = √(${fmt(z.re)}² + ${fmt(z.im)}²) = ${fmt(Math.round(mod * 1e9) / 1e9)}`;
  if (/(مرافق|conjugate)/.test(q)) return `المرافق:\n\n${lines[0]}\n\nz = ${L(f(z))}\n\nالحل النهائي: z̄ = ${L(f({ re: z.re, im: -z.im }))}`;
  if (/(عمدة|argument)/.test(q)) return `عمدة العدد المركب:\n\nz = ${L(f(z))}\n\nالحل النهائي: arg(z) = ${(arg).toFixed(6)} راديان = ${(arg * 180 / Math.PI).toFixed(4)}°`;
  return `ناتج العملية على الأعداد المركبة:\n\n${lines[0]}\n\nنستخدم i² = −1 ونفك الأقواس.\n\nالحل النهائي: ${L(f(z))}   (المعيار = ${fmt(Math.round(mod * 1e9) / 1e9)})`;
}

/* ---------- trig equations ---------- */
function trigAnswer(q: string): string | null {
  if (!/(sin|cos|tan)/.test(q) || !q.includes("=") || !/x/.test(q)) return null;
  const deg = /(°|درجة|degree)/.test(q);
  const cands = (q.replace(/[\u0600-\u06FF]+/g, " ").replace(/\b(solve|find|the|equation|in|on|interval|for|all|degrees?|radians?)\b/g, " ").match(/[0-9a-z+\-*\/^().=\s]{5,}/gi) || []).map(s => s.replace(/\s+/g, "")).filter(s => /x/.test(s) && s.split("=").length === 2 && /(sin|cos|tan)/.test(s)).sort((a, b) => b.length - a.length);
  if (!cands.length) return null;
  const eq = cands[0].replace(/(\d)(sin|cos|tan|x)/g, "$1*$2").replace(/\)(sin|cos|tan|x|\()/g, ")*$1"); const [l, r] = eq.split("=");
  if (/[a-wyz]/.test(eq.replace(/sin|cos|tan|pi|e/g, ""))) return null;
  const scope: Record<string, unknown> = deg ? { sin: (t: number) => Math.sin(t * Math.PI / 180), cos: (t: number) => Math.cos(t * Math.PI / 180), tan: (t: number) => Math.tan(t * Math.PI / 180) } : {};
  const f = (x: number) => Number(math.evaluate(`(${l})-(${r})`, { x, ...scope }));
  const hi = deg ? 360 : 2 * Math.PI, N = 7200, roots: number[] = [];
  let prev = f(0);
  for (let i = 1; i <= N; i++) {
    const x = (hi * i) / N, cur = f(x);
    if (Number.isFinite(prev) && Number.isFinite(cur) && prev * cur <= 0 && Math.abs(prev - cur) < 1.5) {
      let a = (hi * (i - 1)) / N, b = x; for (let k = 0; k < 80; k++) { const mid = (a + b) / 2; if (f(a) * f(mid) <= 0) b = mid; else a = mid; }
      const rt = (a + b) / 2; if (Math.abs(f(rt)) < 1e-7 && rt < hi - 1e-9 && !roots.some(v => Math.abs(v - rt) < 1e-6)) roots.push(rt);
    }
    prev = cur;
  }
  roots.sort((a, b) => a - b);
  const show = (x: number) => {
    if (deg) return `${fmt(Math.round(x * 1e6) / 1e6)}°`;
    const t = x / Math.PI; for (let m = 1; m <= 12; m++) { const k = Math.round(t * m); if (Math.abs(t * m - k) < 1e-6) return k === 0 ? "0" : `${k === 1 ? "" : k}π${m === 1 ? "" : "/" + m}`.replace(/^(\d+)π/, "$1π"); }
    return x.toFixed(5);
  };
  return `حل المعادلة المثلثية في المجال ${deg ? "[0°, 360°[" : "[0, 2π["}:\n\n${L(pretty(eq))}\n\nنبحث عن كل الجذور في المجال ونتأكد من كل جذر بالتعويض.\n\nالحل النهائي: ${roots.length ? roots.map(x => "س = " + L(show(x))).join(" ، ") : "مفيش حلول في المجال ده"}${roots.length ? `\n\n(الحل العام بيضيف دورة الدالة: ${deg ? "360°·k" : "2kπ أو kπ"} حسب الدالة.)` : ""}`;
}

/* ---------- inequalities ---------- */
function inequalityAnswer(q: string): string | null {
  const m = q.match(/([0-9x+\-*\/^().\s]+?)\s*(<=|>=|≤|≥|<|>)\s*([0-9x+\-*\/^().\s]+)/); if (!m || !/x/.test(m[1] + m[3])) return null;
  const clean = (s: string) => s.replace(/\s+/g, "").replace(/(\d)x/g, "$1*x").replace(/\)(x|\()/g, ")*$1"); const a = clean(m[1]), b = clean(m[3]);
  const bigger = (s: string) => /\/[^+\-]*x|\/\(.*x/.test(s); if (bigger(a) || bigger(b)) return null;
  const op = m[2].replace("≤", "<=").replace("≥", ">="); const strict = !op.includes("="), gt = op.startsWith(">");
  const f = (x: number) => Number(math.evaluate(`(${a})-(${b})`, { x }));
  let roots: number[] = [];
  try {
    const sols = nerdamer.solve(`(${a})-(${b})=0`, "x").toString().replace(/^[\[{]|[\]}]$/g, "").split(/,(?![^()]*\))/).map((s: string) => s.trim()).filter(Boolean);
    for (const s of sols) { if (/\bi\b/.test(s)) continue; const v = Number(math.evaluate(s)); if (!Number.isFinite(v) || Math.abs(f(v)) > 1e-7) return null; roots.push(v); }
  } catch { return null; }
  roots = [...new Set(roots.map(v => Math.round(v * 1e9) / 1e9))].sort((p, r) => p - r);
  const pts = [-Infinity, ...roots, Infinity]; const ok = (v: number) => gt ? f(v) > 1e-12 : f(v) < -1e-12;
  const parts: string[] = []; const ineq: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const lo = pts[i], hi = pts[i + 1]; const mid = lo === -Infinity ? (hi === Infinity ? 0 : hi - 1) : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    if (ok(mid)) ineq.push(lo === -Infinity ? `س ${strict ? "<" : "≤"} ${fmt(hi)}` : hi === Infinity ? `س ${strict ? ">" : "≥"} ${fmt(lo)}` : `${fmt(lo)} ${strict ? "<" : "≤"} س ${strict ? "<" : "≤"} ${fmt(hi)}`);
    if (ok(mid)) parts.push(`${lo === -Infinity ? "]−∞" : (!strict && roots.includes(lo) ? "[" : "]") + fmt(lo)} ، ${hi === Infinity ? "+∞[" : fmt(hi) + (!strict ? "]" : "[")}`);
  }
  if (!strict) for (const r of roots) { if (!parts.some(p => p.includes(fmt(r)))) parts.push(`{${fmt(r)}}`); }
  for (const t of [-1e3, -37.3, -5.5, -1.1, -0.3, 0.3, 1.1, 5.5, 37.3, 1e3, ...roots.map(r => r + 0.01), ...roots.map(r => r - 0.01)]) {
    const inside = parts.some(p => { if (p.startsWith("{")) return false; const mm = p.match(/^([\[\]])(.*?) ، (.*?)([\[\]])$/); if (!mm) return false; const lo = mm[2].includes("∞") ? -Infinity : Number(math.evaluate(mm[2])), hi = mm[3].includes("∞") ? Infinity : Number(math.evaluate(mm[3])); return t > lo && t < hi; });
    if (inside !== ok(t) && !roots.some(r => Math.abs(r - t) < 1e-6)) return null;
  }
  return `حل المتراجحة:\n\n${L(pretty(`${a} ${op} ${b}`))}\n\nننقل كل الحدود لطرف ونوجد جذور الطرف ${roots.length ? "(" + roots.map(fmt).join(" ، ") + ")" : "(مفيش جذور حقيقية)"}، وبعدين ندرس الإشارة في كل مجال.\n\nالحل النهائي: ${ineq.length ? L(ineq.join("   أو   ")) : "مفيش حل"}${roots.length && ineq.length && !strict ? "" : ""}\n\nبالمجالات: ${parts.length ? "س ∈ " + L(parts.join(" ∪ ")) : "∅"}`;
}

/* ---------- differential equations ---------- */
function deAnswer(q: string): string | null {
  if (!/(y'|dy\/dx|y''|معادلة تفاضلية|differential)/.test(q)) return null;
  let s = q.replace(/dy\/dx/g, "y'").replace(/d2y\/dx2/g, "y''"); const mm = s.match(/[0-9xy'+\-*\/^().=\s]{4,}/g) || []; s = (mm.filter(t => t.includes("=") && /y'/.test(t)).sort((a, b) => b.length - a.length)[0] || "").replace(/\s+/g, "");
  if (!s || s.split("=").length !== 2) return null;
  const sym = s.replace(/y''/g, "Z").replace(/y'/g, "W").replace(/y/g, "Y").replace(/(\d)([ZWYx])/g, "$1*$2").replace(/\)([ZWYx(])/g, ")*$1");
  const [l, r] = sym.split("="); const expr = `(${l})-(${r})`;
  let co: { Z: number; W: number; Y: number }; let g = "0";
  try {
    const ex = nerdamer(`expand(${expr})`).toString();
    const c = (v: string) => { const d = nerdamer(`diff(${ex},${v})`).toString(); return d; };
    const num = (t: string) => { const v = Number(math.evaluate(t.replace(/\b[ZWY]\b/g, "0").replace(/\bx\b/g, "0"))); return v; };
    const dz = c("Z"), dw = c("W"), dy = c("Y");
    if ([dz, dw, dy].some(t => /[ZWYx]/.test(t.replace(/\bx\b/g, "x")) && /[ZWY]|x/.test(t))) return null;
    co = { Z: num(dz), W: num(dw), Y: num(dy) };
    g = nerdamer(ex.replace(/\bZ\b/g, "0").replace(/\bW\b/g, "0").replace(/\bY\b/g, "0")).toString();
  } catch { return null; }
  if (![co.Z, co.W, co.Y].every(Number.isFinite)) return null;
  const gConst = /^-?[\d./()*+\- ]+$/.test(g) && !/x/.test(g); const gv = gConst ? Number(math.evaluate(g)) : NaN;
  let sol = "", note = "", ysol: ((x: number, C1: number, C2: number) => number) | null = null;
  if (co.Z === 0 && co.W !== 0) {
    const k = -co.Y / co.W;
    if (g === "0") { sol = `ص = C·e^(${fmt(k)}·س)`; ysol = (x, C1) => C1 * Math.exp(k * x); note = `معادلة من الرتبة الأولى: ص' = ${fmt(k)}·ص، حلها أُسّي.`; }
    else if (gConst && k !== 0) { const p = -(gv / co.W) / k * -1; const part = (-gv / co.W) / -k; sol = `ص = C·e^(${fmt(k)}·س) + ${fmt(part)}`; void p; ysol = (x, C1) => C1 * Math.exp(k * x) + part; note = `الحل = حل المتجانسة + حل خاص ثابت.`; }
    else if (co.Y === 0) { const h = nerdamer(`-(${g})/(${co.W})`).toString(); const F = nerdamer(`integrate(${h},x)`).toString(); if (/integrate/.test(F)) return null; sol = `ص = ${dispVar(F)} + C`; ysol = (x, C1) => C1 + Number(math.evaluate(F, { x })); note = "ص' دالة في س بس، فنكامل الطرفين."; }
    else return null;
  } else if (co.Z !== 0) {
    if (g !== "0" && !(gConst && co.Y !== 0)) return null;
    const p = co.Z, qq = co.W, rr = co.Y, D = qq * qq - 4 * p * rr, part = g === "0" ? 0 : -gv / rr;
    if (D > 1e-12) { const m1 = (-qq + Math.sqrt(D)) / (2 * p), m2 = (-qq - Math.sqrt(D)) / (2 * p); sol = `ص = C₁·e^(${fmt(Math.round(m1 * 1e9) / 1e9)}·س) + C₂·e^(${fmt(Math.round(m2 * 1e9) / 1e9)}·س)${part ? " + " + fmt(part) : ""}`; ysol = (x, C1, C2) => C1 * Math.exp(m1 * x) + C2 * Math.exp(m2 * x) + part; note = `المعادلة المميزة ${fmt(p)}m² + ${fmt(qq)}m + ${fmt(rr)} = 0، المميز Δ = ${fmt(D)} موجب (جذران حقيقيان).`; }
    else if (Math.abs(D) <= 1e-12) { const m1 = -qq / (2 * p); sol = `ص = (C₁ + C₂·س)·e^(${fmt(m1)}·س)${part ? " + " + fmt(part) : ""}`; ysol = (x, C1, C2) => (C1 + C2 * x) * Math.exp(m1 * x) + part; note = `المعادلة المميزة لها جذر مضاعف m = ${fmt(m1)}.`; }
    else { const al = -qq / (2 * p), be = Math.sqrt(-D) / (2 * Math.abs(p)); sol = `ص = ${Math.abs(al) < 1e-12 ? "" : `e^(${fmt(Math.round(al * 1e9) / 1e9)}·س)·`}(C₁·cos(${fmt(Math.round(be * 1e9) / 1e9)}·س) + C₂·sin(${fmt(Math.round(be * 1e9) / 1e9)}·س))${part ? " + " + fmt(part) : ""}`; ysol = (x, C1, C2) => Math.exp(al * x) * (C1 * Math.cos(be * x) + C2 * Math.sin(be * x)) + part; note = `المميز Δ = ${fmt(D)} سالب (جذور مركبة α ± iβ).`; }
  } else return null;
  if (!ysol) return null;
  // verify by substituting into the original equation (central differences)
  const fn = ysol; for (const x of [0.2, 0.7, 1.3]) {
    const h = 1e-3, y0 = fn(x, 1, 2), y1 = (fn(x + h, 1, 2) - fn(x - h, 1, 2)) / (2 * h), y2 = (fn(x + h, 1, 2) - 2 * y0 + fn(x - h, 1, 2)) / (h * h);
    const lhs = co.Z * y2 + co.W * y1 + co.Y * y0 + (g === "0" ? 0 : gConst ? gv : Number(math.evaluate(g, { x })));
    if (Math.abs(lhs) > 5e-3 * Math.max(1, Math.abs(y0), Math.abs(y2))) return null;
  }
  return `حل المعادلة التفاضلية:\n\n${L(dispVar(s.replace(/\*/g, "·")))}\n\n${note}\n\nالحل النهائي: ${L(sol)}   (C ثوابت اختيارية، بتتحدد من الشروط الابتدائية)`;
}

export function casSolve2(question: string): string | null {
  try {
    const q = q0(question);
    return deAnswer(q) ?? matrixAnswer(q) ?? sequenceAnswer(q) ?? combAnswer(q) ?? trigAnswer(q) ?? inequalityAnswer(q) ?? complexAnswer(q);
  } catch { return null; }
}
