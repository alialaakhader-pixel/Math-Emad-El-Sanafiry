// Exact symbolic solving for typed calculus and algebra questions (derivative, integral, limit, polynomial equations,
// factor / expand). Uses nerdamer (Apache-2.0) and checks every result numerically with mathjs before it is shown.
// Returns null whenever it is not sure, so the question falls through to the AI solver.
import nerdamer from "nerdamer/dist/bundle.js";
import { create, all } from "mathjs";

const math = create(all, {});
const AD = "٠١٢٣٤٥٦٧٨٩";
const FN = ["sin", "cos", "tan", "cot", "sec", "csc", "asin", "acos", "atan", "ln", "log", "sqrt", "exp", "abs", "pi", "e"];

function norm(s: string) {
  return s.replace(/[٠-٩]/g, d => String(AD.indexOf(d))).replace(/٫/g, ".").replace(/[−–—]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/")
    .replace(/(?<![\u0600-\u06FF])س(?![\u0600-\u06FF])/g, "x").replace(/²/g, "^2").replace(/³/g, "^3").replace(/√\s*\(/g, "sqrt(").replace(/√\s*([0-9x]+)/g, "sqrt($1)").replace(/π/g, "pi")
    .replace(/\bln\s*\(/g, "log(").replace(/[“”«»]/g, "").replace(/،/g, ",").replace(/؟/g, "?");
}
const lettersOk = (e: string) => e.replace(new RegExp(FN.join("|"), "g"), "").replace(/x/g, "").match(/[a-z]/i) === null;
const balanced = (e: string) => { let d = 0; for (const c of e) { if (c === "(") d++; else if (c === ")") { d--; if (d < 0) return false; } } return d === 0; };

function candidates(q: string): string[] {
  const words = q.replace(/[\u0600-\u06FF]+/g, " ").replace(/\b(find|the|of|solve|derivative|differentiate|integral|integrate|limit|factor|expand|simplify|as|approaches|tends|to|from|and|with|respect|dx|dy|what|is|for|equation|if|then|where|when)\b/gi, " ");
  const found = words.match(/[0-9a-z+\-*\/^().=\s]{3,}/gi) || [];
  return found.map(s => s.trim()).filter(s => s && /[0-9x]/.test(s)).sort((a, b) => b.length - a.length);
}
function clean(e: string) { return e.replace(/\s+/g, "").replace(/^[+*\/^=]+|[+\-*\/^=]+$/g, "").replace(/^f\(x\)=|^y=/i, ""); }

function show(v: string) {
  return "\u202D" + v.replace(/(?<![a-z])x(?![a-z])/g, "س").replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/\^\(?(-?\d+)\)?/g, "^$1").replace(/(\d)\*س/g, "$1س").replace(/\*/g, "·").replace(/log\(/g, "ln(").replace(/\be\^/g, "e^") + "\u202C";
}
const near = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(a), Math.abs(b));
const ev = (expr: string, x: number) => { const v = math.evaluate(expr.replace(/\^/g, "^").replace(/\blog\(/g, "log("), { x }); return typeof v === "number" ? v : NaN; };
const samples = [0.37, 1.21, 2.13, 0.71, 1.67];

function derivativeAnswer(expr: string): string | null {
  const d = nerdamer(`diff(${expr},x)`).toString();
  if (/diff|integrate/.test(d)) return null;
  let ok = 0;
  for (const p of samples) { const h = 1e-5; try { const num = (ev(expr, p + h) - ev(expr, p - h)) / (2 * h); const sym = ev(d, p); if (near(num, sym)) ok++; else if (Number.isFinite(num) && Number.isFinite(sym)) return null; } catch { /* skip */ } }
  if (ok < 2) return null;
  return `المشتقة (التفاضل) بالنسبة لـ س:\n\nالدالة: f(س) = ${show(expr)}\n\nنطبق قواعد الاشتقاق (قاعدة القوة، الضرب، السلسلة) حد بحد.\n\nالحل النهائي: f'(س) = ${show(d)}`;
}
function integralAnswer(expr: string, lo?: string, hi?: string): string | null {
  const F = nerdamer(`integrate(${expr},x)`).toString();
  if (/integrate|diff/.test(F)) return null;
  let ok = 0;
  for (const p of samples) { const h = 1e-5; try { const num = (ev(F, p + h) - ev(F, p - h)) / (2 * h); const orig = ev(expr, p); if (near(num, orig)) ok++; else if (Number.isFinite(num) && Number.isFinite(orig)) return null; } catch { /* skip */ } }
  if (ok < 2) return null;
  if (lo !== undefined && hi !== undefined) {
    const a = Number(math.evaluate(lo)), b = Number(math.evaluate(hi));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const val = ev(F, b) - ev(F, a); if (!Number.isFinite(val)) return null;
    const shown = Number.isInteger(val) ? String(val) : String(math.round(val, 8));
    return `التكامل المحدود من ${lo} إلى ${hi}:\n\nأولاً نوجد الدالة الأصلية: F(س) = ${show(F)}\n\nثانياً نعوّض: F(${hi}) − F(${lo})\n\nالحل النهائي: ${shown}`;
  }
  return `التكامل غير المحدد:\n\n∫ ${show(expr)} دس\n\nنكامل حد بحد بقاعدة القوة والتكاملات الأساسية.\n\nالحل النهائي: ${show(F)} + ثابت (C)`;
}
function limitAnswer(expr: string, pt: string): string | null {
  const L = nerdamer(`limit(${expr},x,${pt})`).toString();
  if (/limit|undefined|NaN/i.test(L)) return null;
  const p = Number(math.evaluate(pt)); if (!Number.isFinite(p)) return null;
  if (/Infinity|inf/i.test(L)) return null;
  const target = Number(math.evaluate(L.replace(/\be\b/g, "e"))); if (!Number.isFinite(target)) return null;
  let ok = 0; for (const h of [1e-3, 1e-4]) { try { if (near(ev(expr, p + h), target) || Math.abs(ev(expr, p + h) - target) < 5e-3) ok++; } catch { /* skip */ } }
  if (ok < 1) return null;
  return `النهاية عندما س تؤول إلى ${pt}:\n\nlim f(س) = ${show(expr)}\n\nنعوّض ونبسّط (ولو طلع 0/0 نحلل أو نختصر الحد المشترك).\n\nالحل النهائي: ${show(L)}`;
}
function equationAnswer(eq: string): string | null {
  const [l, r] = eq.split("="); if (!l || r === undefined || eq.split("=").length !== 2) return null;
  const expr = `(${l})-(${r})`;
  const poly = nerdamer(`expand(${expr})`).toString();
  const sols = nerdamer.solve(`${l}=${r}`, "x").toString().replace(/^\[|\]$/g, "").replace(/^\{|\}$/g, "").split(/,(?![^()]*\))/).map((s: string) => s.trim()).filter(Boolean);
  if (!sols.length) return null;
  const reals: string[] = []; let hasComplex = false;
  for (const s of sols) {
    if (/\bi\b/.test(s)) { hasComplex = true; continue; }
    const v = Number(math.evaluate(s)); if (!Number.isFinite(v)) return null;
    let res = NaN; try { res = ev(poly, v); } catch { return null; }
    if (Math.abs(res) > 1e-6 * Math.max(1, Math.abs(v) ** 3)) return null;
    reals.push(Number.isInteger(v) ? String(v) : /^[\d.\-+*/()^ a-z]*$/i.test(s) && s.includes("/") && s.length < 12 ? s : String(math.round(v, 6)));
  }
  let steps = `ننقل كل الحدود لطرف واحد: ${show(poly)} = 0`;
  try {
    const c = JSON.parse(nerdamer.coeffs(poly, "x").toString().replace(/([+-]?[\d.]+)\/([\d.]+)/g, (_: string, a: string, b: string) => String(Number(a) / Number(b))));
    if (Array.isArray(c) && c.length === 3 && c.every(n => Number.isFinite(Number(n)))) { const [cc, bb, aa] = c.map(Number); const D = bb * bb - 4 * aa * cc; steps += `\n\nمعادلة تربيعية: a = ${aa} ، b = ${bb} ، c = ${cc}\n\nالمميّز Δ = b² − 4ac = ${D}${D < 0 ? " (سالب، يعني مفيش حلول حقيقية)" : D === 0 ? " (صفر، يعني حل واحد مكرر)" : " (موجب، يعني حلّين مختلفين)"}`; }
  } catch { /* coefficient view is optional */ }
  const finalLine = reals.length ? `س = ${reals.map(show).join(" ، س = ")}` : "مفيش حلول حقيقية";
  return `حل المعادلة:\n\n${steps}\n\nبعد التحليل أو القانون ثم التحقق بالتعويض في المعادلة الأصلية:\n\nالحل النهائي: ${finalLine}${hasComplex && reals.length ? " (وفيه حلول مركبة كمان)" : ""}`;
}
function algebraAnswer(kind: "factor" | "expand" | "simplify", expr: string): string | null {
  const out = nerdamer(`${kind}(${expr})`).toString();
  if (!out || /factor|expand|simplify/.test(out)) return null;
  for (const p of samples) { try { if (!near(ev(expr, p), ev(out, p))) return null; } catch { return null; } }
  const t = kind === "factor" ? "التحليل" : kind === "expand" ? "فك الأقواس" : "التبسيط";
  return `${t}:\n\n${show(expr)}\n\nالحل النهائي: ${show(out)}`;
}

export function casSolve(question: string): string | null {
  try {
    const q = norm(question).toLowerCase();
    const isDer = /(اشتق|مشتق|تفاضل|derivative|differentiate|d\/dx)/.test(q);
    const isInt = /(كامل|تكامل|integra|∫)/.test(q);
    const isLim = /(نهاي|limit|\blim\b)/.test(q);
    const isFac = /(حلل|تحليل|factor)/.test(q), isExp = /(فك |افتح|expand)/.test(q), isSim = /(بسّط|بسط|simplify)/.test(q);
    const kinds = [isDer, isInt, isLim, isFac, isExp, isSim].filter(Boolean).length;
    if (kinds > 1) return null;
    if (isLim) {
      const m = q.match(/(?:تؤول إلى|تؤول الى|تقترب من|تسعى إلى|->|→|approaches|tends to|to)\s*(-?[0-9.]+)/);
      if (!m) return null;
      const body = q.replace(m[0], " ").replace(/x\s*$/, "");
      for (const c of candidates(body)) { const e = clean(c); if (e.includes("=") || !/x/.test(e) || !lettersOk(e) || !balanced(e)) continue; const r = limitAnswer(e, m[1]); if (r) return r; }
      return null;
    }
    if (isInt) {
      const b = q.match(/(?:من|from)\s*(-?[0-9.]+)\s*(?:إلى|الى|حتى|to)\s*(-?[0-9.]+)/);
      const body = b ? q.replace(b[0], " ") : q;
      for (const c of candidates(body)) { const e = clean(c.replace(/dx|دس/g, "")); if (e.includes("=") || !/x/.test(e) || !lettersOk(e) || !balanced(e)) continue; const r = integralAnswer(e, b?.[1], b?.[2]); if (r) return r; }
      return null;
    }
    if (isDer || isFac || isExp || isSim) {
      for (const c of candidates(q)) {
        const e = clean(c); if (e.includes("=") || !/x/.test(e) || !lettersOk(e) || !balanced(e)) continue;
        const r = isDer ? derivativeAnswer(e) : algebraAnswer(isFac ? "factor" : isExp ? "expand" : "simplify", e); if (r) return r;
      }
      return null;
    }
    // Plain equation in x of degree 2 or more (linear ones are handled by the existing exact solver first).
    if (q.includes("=") && /x/.test(q) && /(حل|solve|معادل|أوجد|اوجد|\bx\b)/.test(q + " x")) {
      for (const c of candidates(q)) {
        const e = clean(c); if (e.split("=").length !== 2 || !/x/.test(e) || !lettersOk(e) || !balanced(e) || e.length > 90) continue;
        const r = equationAnswer(e); if (r) return r;
      }
    }
    return null;
  } catch { return null; }
}
