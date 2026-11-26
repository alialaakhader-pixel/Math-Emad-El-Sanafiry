import { extractQuadratic } from "@/lib/arabic-math";

export type Solution = { title: string; steps: string[]; answers: string[]; error?: string };
const f = (n: number) => { if (Math.abs(n) < 1e-12) return "0"; const s = Number(n.toPrecision(10)).toString(); return s; };
const sg = (n: number) => (n < 0 ? "−" : "+");
const term = (n: number, v: string, first = false) => { const a = Math.abs(n); const body = a === 1 && v ? v : f(a) + v; return first ? (n < 0 ? "−" : "") + body : ` ${sg(n)} ${body}`; };
const poly = (cs: [number, string][]) => { let out = ""; let first = true; for (const [n, v] of cs) { if (Math.abs(n) < 1e-12) continue; out += term(n, v, first); first = false; } return (out || "0"); };
const P = (n: number) => (n < 0 ? `(${f(n)})` : f(n));
export const toAr = (s: string) => s.replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]).replace(/\./g, "٫");

export function solveQuadratic(a: number, b: number, c: number, v = "س"): Solution {
  const title = "حل معادلة من الدرجة الثانية";
  const steps: string[] = [`المعادلة: ${poly([[a, v + "²"], [b, v], [c, ""]])} = 0`, `المعاملات: a = ${f(a)} ، b = ${f(b)} ، c = ${f(c)}`];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) return { title, steps: [...steps, Math.abs(c) < 1e-12 ? "المعادلة صحيحة دائماً." : "المعادلة مستحيلة (لا حل)."], answers: [Math.abs(c) < 1e-12 ? "كل الأعداد" : "لا يوجد حل"] };
    steps.push("بما أن a = 0 فالمعادلة من الدرجة الأولى.", `${poly([[b, v]])} = ${f(-c)}`, `${v} = ${f(-c)} ÷ ${P(b)} = ${f(-c / b)}`);
    return { title, steps, answers: [`${v} = ${f(-c / b)}`] };
  }
  const d = b * b - 4 * a * c;
  steps.push(`نحسب المميز: Δ = b² − 4ac`, `Δ = ${P(b)}² − 4 × ${P(a)} × ${P(c)} = ${f(b * b)} − ${f(4 * a * c)} = ${f(d)}`);
  if (Math.abs(d) < 1e-12) { const r = -b / (2 * a); steps.push("المميز يساوي صفراً: للمعادلة حل واحد مكرر.", `${v} = −b ÷ 2a = ${f(-b)} ÷ ${f(2 * a)} = ${f(r)}`); return { title, steps, answers: [`${v} = ${f(r)}`] }; }
  if (d > 0) {
    const s = Math.sqrt(d); steps.push("المميز موجب: للمعادلة حلان حقيقيان مختلفان.", `√Δ = √${f(d)} = ${f(s)}`, `${v}₁ = (−b + √Δ) ÷ 2a = (${f(-b)} + ${f(s)}) ÷ ${f(2 * a)} = ${f((-b + s) / (2 * a))}`, `${v}₂ = (−b − √Δ) ÷ 2a = (${f(-b)} − ${f(s)}) ÷ ${f(2 * a)} = ${f((-b - s) / (2 * a))}`);
    steps.push(`التحقق: مجموع الجذرين = −b/a = ${f(-b / a)} ، وجداؤهما = c/a = ${f(c / a)}`);
    return { title, steps, answers: [`${v}₁ = ${f((-b + s) / (2 * a))}`, `${v}₂ = ${f((-b - s) / (2 * a))}`] };
  }
  const re = -b / (2 * a), im = Math.sqrt(-d) / (2 * Math.abs(a)); steps.push("المميز سالب: لا توجد حلول حقيقية، والحلان عقديان.", `${v} = (−b ± i√(−Δ)) ÷ 2a = ${f(re)} ± ${f(im)} i`);
  return { title, steps, answers: [`لا يوجد حل حقيقي`, `${v} = ${f(re)} ± ${f(im)} i`] };
}

export function solveLinearText(raw: string): Solution {
  try {
    const { variable, a, b, c } = extractQuadratic(raw);
    const r = solveQuadratic(a, b, c, variable);
    return { ...r, title: "حل معادلة نصية", steps: [`المعادلة المكتوبة: ${raw.trim()}`, `ننقل كل الحدود إلى طرف واحد ونجمع المتشابهة: ${poly([[a, variable + "²"], [b, variable], [c, ""]])} = 0`, ...r.steps.slice(1)] };
  } catch (e) { return { title: "حل معادلة نصية", steps: [], answers: [], error: e instanceof Error ? e.message : "تعذر الحل." }; }
}

export function solveSystem2(a1: number, b1: number, c1: number, a2: number, b2: number, c2: number): Solution {
  const title = "حل جملة معادلتين بمجهولين (كرامر)";
  const steps = [`(١) ${poly([[a1, "س"], [b1, "ص"]])} = ${f(c1)}`, `(٢) ${poly([[a2, "س"], [b2, "ص"]])} = ${f(c2)}`];
  const D = a1 * b2 - a2 * b1; steps.push(`المحدد: D = a₁b₂ − a₂b₁ = ${P(a1)}×${P(b2)} − ${P(a2)}×${P(b1)} = ${f(D)}`);
  if (Math.abs(D) < 1e-12) { const Dx = c1 * b2 - c2 * b1, Dy = a1 * c2 - a2 * c1; steps.push(`D = 0 إذن لا يوجد حل وحيد.`, Math.abs(Dx) < 1e-12 && Math.abs(Dy) < 1e-12 ? "المعادلتان متكافئتان: عدد لا نهائي من الحلول." : "المعادلتان متوازيتان: لا يوجد حل."); return { title, steps, answers: [Math.abs(Dx) < 1e-12 && Math.abs(Dy) < 1e-12 ? "عدد لا نهائي من الحلول" : "لا يوجد حل"] }; }
  const Dx = c1 * b2 - c2 * b1, Dy = a1 * c2 - a2 * c1;
  steps.push(`D_س = c₁b₂ − c₂b₁ = ${P(c1)}×${P(b2)} − ${P(c2)}×${P(b1)} = ${f(Dx)}`, `D_ص = a₁c₂ − a₂c₁ = ${P(a1)}×${P(c2)} − ${P(a2)}×${P(c1)} = ${f(Dy)}`, `س = D_س ÷ D = ${f(Dx)} ÷ ${f(D)} = ${f(Dx / D)}`, `ص = D_ص ÷ D = ${f(Dy)} ÷ ${f(D)} = ${f(Dy / D)}`);
  const x = Dx / D, y = Dy / D; steps.push(`التحقق (١): ${P(a1)}×${P(x)} + ${P(b1)}×${P(y)} = ${f(a1 * x + b1 * y)} ✓`, `التحقق (٢): ${P(a2)}×${P(x)} + ${P(b2)}×${P(y)} = ${f(a2 * x + b2 * y)} ✓`);
  return { title, steps, answers: [`س = ${f(x)}`, `ص = ${f(y)}`] };
}

const det3 = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
export function solveSystem3(m: number[][]): Solution {
  const title = "حل جملة ثلاث معادلات (كرامر)";
  const vs = ["س", "ص", "ع"]; const steps = m.map((r, i) => `(${i + 1}) ${poly([[r[0], "س"], [r[1], "ص"], [r[2], "ع"]])} = ${f(r[3])}`);
  const A = m.map(r => r.slice(0, 3)); const D = det3(A); steps.push(`المحدد الرئيسي D = ${f(D)}`);
  if (Math.abs(D) < 1e-12) { steps.push("D = 0: لا يوجد حل وحيد (إما لا حل أو عدد لا نهائي من الحلول)."); return { title, steps, answers: ["لا يوجد حل وحيد"] }; }
  const out: string[] = [];
  for (let k = 0; k < 3; k++) { const Mk = A.map((r, i) => r.map((x, j) => (j === k ? m[i][3] : x))); const Dk = det3(Mk); steps.push(`D_${vs[k]} = ${f(Dk)}  ⟵ نستبدل عمود ${vs[k]} بالثوابت`, `${vs[k]} = D_${vs[k]} ÷ D = ${f(Dk)} ÷ ${f(D)} = ${f(Dk / D)}`); out.push(`${vs[k]} = ${f(Dk / D)}`); }
  return { title, steps, answers: out };
}

export function solveCubic(a: number, b: number, c: number, d: number): Solution {
  const title = "حل معادلة من الدرجة الثالثة";
  const steps = [`المعادلة: ${poly([[a, "س³"], [b, "س²"], [c, "س"], [d, ""]])} = 0`];
  if (Math.abs(a) < 1e-12) return solveQuadratic(b, c, d);
  // depressed cubic t^3 + pt + q (x = t - b/3a)
  const B = b / a, C = c / a, D = d / a; const p = C - B * B / 3, q = 2 * B ** 3 / 27 - B * C / 3 + D; const sh = B / 3;
  steps.push(`نقسم على a: س³ ${term(B, "س²")}${term(C, "س")}${term(D, "")} = 0`, `نستخدم التعويض: س = t ${sh < 0 ? "+" : "−"} ${f(Math.abs(sh))}`, `تصبح المعادلة: t³ ${term(p, "t")}${term(q, "")} = 0 , p = ${f(p)} , q = ${f(q)}`);
  const disc = (q / 2) ** 2 + (p / 3) ** 3; steps.push(`المميز: (q/2)² + (p/3)³ = ${f(disc)}`);
  let roots: number[] = [];
  if (disc > 1e-12) { const s = Math.sqrt(disc); const u = Math.cbrt(-q / 2 + s), w = Math.cbrt(-q / 2 - s); roots = [u + w - sh]; steps.push("المميز موجب، فللمعادلة جذر حقيقي واحد (صيغة كاردانو).", `t = ${f(u + w)}`); }
  else { const r = Math.sqrt(-((p / 3) ** 3)); const th = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r || 1)))); const m = 2 * Math.cbrt(r); roots = [0, 1, 2].map(k => m * Math.cos((th + 2 * Math.PI * k) / 3) - sh); steps.push("المميز سالب أو صفر، فللمعادلة ثلاثة جذور حقيقية (الطريقة المثلثية).", `r = ${f(r)} , θ = ${f(th)} rad`); }
  const uniq = [...new Set(roots.map(x => f(x)))]; steps.push(`الجذور: ${uniq.join(" , ")}`);
  roots.slice(0, 3).forEach(x => steps.push(`التحقق عند س = ${f(x)}: f = ${f(Math.abs(((a * x + b) * x + c) * x + d) < 1e-9 ? 0 : ((a * x + b) * x + c) * x + d)}`));
  return { title, steps, answers: uniq.map((x, i) => `س${uniq.length > 1 ? ["₁", "₂", "₃"][i] : ""} = ${x}`) };
}
