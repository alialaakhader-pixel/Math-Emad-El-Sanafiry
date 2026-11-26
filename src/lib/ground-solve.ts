import { solveLinearText, solveSystem2, toAr, type Solution } from "@/lib/solver-steps";

const AD = "٠١٢٣٤٥٦٧٨٩";
function norm(s: string) {
  return s.replace(/[٠-٩]/g, d => String(AD.indexOf(d))).replace(/٫/g, ".").replace(/[−–—]/g, "-").replace(/[×·]/g, "*").replace(/[xX]/g, "س").replace(/[yY]/g, "ص").replace(/،/g, ",").replace(/؛/g, ";");
}
function side(expr: string): { s: number; p: number; k: number } | null {
  const e = expr.replace(/\s+/g, "").replace(/\*/g, "");
  if (!e || /[^0-9.+\-سص]/.test(e)) return null;
  let s = 0, p = 0, k = 0;
  const re = /([+-]?)(\d*\.?\d*)([سص]?)/g; let m: RegExpExecArray | null; let used = 0;
  while ((m = re.exec(e)) && m[0] !== "") {
    used += m[0].length;
    const sign = m[1] === "-" ? -1 : 1; const num = m[2] === "" ? (m[3] ? 1 : NaN) : Number(m[2]);
    if (Number.isNaN(num)) return null;
    if (m[3] === "س") s += sign * num; else if (m[3] === "ص") p += sign * num; else k += sign * num;
  }
  return used === e.length ? { s, p, k } : null;
}
function line(eq: string) {
  const [l, r] = eq.split("="); if (!l || r === undefined || eq.split("=").length !== 2) return null;
  const a = side(l), b = side(r); if (!a || !b) return null;
  return { a: a.s - b.s, b: a.p - b.p, c: b.k - a.k };
}
/** Returns a verified solution for simple equations the user typed, or null. */
export function groundSolve(question: string): Solution | null {
  const q = norm(question);
  const pieces = q.split(/\n|;|,|\s+و\s+|\sand\s/).map(t => t.replace(/^[^=\-+0-9سص]*?(?=[-+0-9سص])/, "").trim()).filter(t => t.includes("="));
  if (pieces.length === 2) {
    const l1 = line(pieces[0]), l2 = line(pieces[1]);
    if (l1 && l2 && (l1.b !== 0 || l2.b !== 0)) return solveSystem2(l1.a, l1.b, l1.c, l2.a, l2.b, l2.c);
  }
  if (pieces.length === 1 && /[سص]/.test(pieces[0])) {
    const sol = solveLinearText(pieces[0].replace(/\^2/g, "²"));
    if (!sol.error) return sol;
  }
  return null;
}
export function formatSolution(sol: Solution, arabicDigits = false) {
  const t = (x: string) => arabicDigits ? toAr(x) : x;
  return [`**${sol.title}**`, ...sol.steps.map((s, i) => `الخطوة ${i + 1}: ${t(s)}`), `**الحل النهائي:** ${sol.answers.map(t).join(" ، ")}`].join("\n\n");
}
