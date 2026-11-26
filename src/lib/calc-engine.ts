// Pure calculator engine on top of mathjs. No React, no aliases (testable in node).
export type Angle = "DEG" | "RAD" | "GRAD";
export type Disp = { kind: "NORM" | "FIX" | "SCI" | "ENG"; n: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type M = any;
export type Vars = Record<string, number>;

export function buildScope(math: M, angle: Angle, vars: Vars, ans: number): Record<string, unknown> {
  const f = angle === "DEG" ? Math.PI / 180 : angle === "GRAD" ? Math.PI / 200 : 1;
  const rad = (x: number) => x * f; const back = (x: number) => x / f;
  const num = (x: unknown) => (typeof x === "number" ? x : Number(x));
  const base: Record<string, unknown> = {
    sin: (x: number) => { const r = rad(x); return angle === "DEG" && Number.isInteger(x / 180) ? 0 : Math.sin(r); },
    cos: (x: number) => { return angle === "DEG" && Number.isInteger((x - 90) / 180) ? 0 : Math.cos(rad(x)); },
    tan: (x: number) => { if (angle === "DEG" && Number.isInteger((x - 90) / 180)) return NaN; return angle === "DEG" && Number.isInteger(x / 180) ? 0 : Math.tan(rad(x)); },
    asin: (x: number) => back(num(math.asin(x))), acos: (x: number) => back(num(math.acos(x))), atan: (x: number) => back(Math.atan(x)),
    atan2: (y: number, x: number) => back(Math.atan2(y, x)),
    sec: (x: number) => 1 / Math.cos(rad(x)), csc: (x: number) => 1 / Math.sin(rad(x)), cot: (x: number) => 1 / Math.tan(rad(x)),
    ln: (x: number) => math.log(x), log10: (x: number) => math.log10(x),
    logb: (b: number, x: number) => math.log(x) / math.log(b),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    nthRoot: (x: number, n: number) => num(math.nthRoot(x, n)),
    nPr: (n: number, r: number) => math.permutations(n, r), nCr: (n: number, r: number) => math.combinations(n, r),
    rand: () => Math.round(Math.random() * 1000) / 1000, randint: (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a,
    pol: (x: number, y: number) => ({ tag: ["r", "θ"], vals: [Math.hypot(x, y), back(Math.atan2(y, x))] }),
    rec: (r: number, t: number) => ({ tag: ["x", "y"], vals: [r * Math.cos(rad(t)), r * Math.sin(rad(t))] }),
    Ans: ans, ...Object.fromEntries("ABCDEFXYM".split("").map(l => [l, 0])), ...vars,
  };
  const raw = (fn: (args: unknown[]) => unknown) => (...a: unknown[]) => fn(a);
  const fx = (src: string) => { const code = math.compile(String(src)); return (x: number) => num(code.evaluate({ ...base, x, k: x })); };
  const aval = (v: unknown) => num(v);
  base.diff = raw(args => { const g = fx(args[0] as string); const x0 = aval(args[1]); const h = 1e-3 * Math.max(1, Math.abs(x0)); // 5-point stencil with Richardson
    const d = (hh: number) => (g(x0 - 2 * hh) - 8 * g(x0 - hh) + 8 * g(x0 + hh) - g(x0 + 2 * hh)) / (12 * hh);
    const d1 = d(h), d2 = d(h / 2); return (16 * d2 - d1) / 15; });
  base.integ = raw(args => { const g = fx(args[0] as string); const a = aval(args[1]), b = aval(args[2]);
    // Gauss-Kronrod style via adaptive Simpson
    const simpson = (fa: number, fm: number, fb: number, a0: number, b0: number) => (b0 - a0) / 6 * (fa + 4 * fm + fb);
    const rec = (a0: number, b0: number, fa: number, fm: number, fb: number, whole: number, eps: number, depth: number): number => {
      const m = (a0 + b0) / 2, lm = (a0 + m) / 2, rm = (m + b0) / 2; const flm = g(lm), frm = g(rm);
      const left = simpson(fa, flm, fm, a0, m), right = simpson(fm, frm, fb, m, b0);
      if (depth <= 0 || Math.abs(left + right - whole) <= 15 * eps) return left + right + (left + right - whole) / 15;
      return rec(a0, m, fa, flm, fm, left, eps / 2, depth - 1) + rec(m, b0, fm, frm, fb, right, eps / 2, depth - 1);
    };
    if (a === b) return 0; const sign = a < b ? 1 : -1; const lo = Math.min(a, b), hi = Math.max(a, b);
    // split into 8 panels to avoid false convergence on oscillating functions
    const N = 8; let total = 0; for (let i = 0; i < N; i++) { const p = lo + (hi - lo) * i / N, q = lo + (hi - lo) * (i + 1) / N; const fa = g(p), fb = g(q), fm = g((p + q) / 2); total += rec(p, q, fa, fm, fb, simpson(fa, fm, fb, p, q), 1e-11, 18); }
    return sign * total; });
  const series = (isProd: boolean) => raw(args => { const g = fx(args[0] as string); const a = Math.round(aval(args[1])), b = Math.round(aval(args[2])); if (b - a > 100000) throw new Error("المدى كبير"); let s = isProd ? 1 : 0; for (let k = a; k <= b; k++) s = isProd ? s * g(k) : s + g(k); return s; });
  base.sigma = series(false); base.prod = series(true);
  return base;
}

const AR = "٠١٢٣٤٥٦٧٨٩";
export function prepare(text: string, normalize: (s: string) => string): string {
  let s = normalize(text);
  s = s.replace(/√\(/g, "sqrt(").replace(/√(\d+(?:\.\d+)?|[a-zA-Z]+)/g, "sqrt($1)").replace(/∛/g, "cbrt").replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/Ans/g, "Ans");
  s = s.replace(/[٠-٩]/g, d => String(AR.indexOf(d)));
  // degrees-minutes-seconds: 12°30'15" -> (12+30/60+15/3600)
  s = s.replace(/(\d+(?:\.\d+)?)°(?:(\d+(?:\.\d+)?)')?(?:(\d+(?:\.\d+)?)")?/g, (_m, d, mi, se) => `(${d}+${mi || 0}/60+${se || 0}/3600)`);
  s = s.replace(/(?<![a-zA-Z\d.])(\d+(?:\.\d+)?)(?=pi|\(|sqrt|sin|cos|tan|log|ln|sigma|prod|integ|diff|rand|gcd|lcm|abs|[a-zA-Z]\b)/g, "$1*").replace(/(\))(?=\d|pi|sqrt|\()/g, "$1*");
  if (!s || s.length > 400) throw new Error("تعبير غير صالح.");
  if (/[;\[\]{}`\\'"]/.test(s) || /\b(import|createUnit|evaluate|parse|compile|simplify|derivative|function|help|config)\b/i.test(s)) throw new Error("رموز غير مسموحة.");
  return wrapFirstArgs(s);
}

function wrapFirstArgs(s: string): string {
  const names = ["diff", "integ", "sigma", "prod"]; let out = ""; let i = 0;
  while (i < s.length) {
    const nm = names.find(n => s.startsWith(n + "(", i) && (i === 0 || !/[a-zA-Z0-9_]/.test(s[i - 1])));
    if (!nm) { out += s[i++]; continue; }
    let j = i + nm.length + 1, depth = 1, comma = -1;
    for (; j < s.length && depth > 0; j++) { const c = s[j]; if (c === "(") depth++; else if (c === ")") depth--; else if (c === "," && depth === 1 && comma < 0) comma = j; }
    if (depth !== 0 || comma < 0) throw new Error("صيغة الدالة غير صحيحة.");
    const first = s.slice(i + nm.length + 1, comma); const rest = s.slice(comma, j - 1);
    out += `${nm}("${first.replace(/"/g, "")}"${wrapFirstArgs(rest)})`; i = j;
  }
  return out;
}

export function evalExpr(math: M, text: string, angle: Angle, vars: Vars, ans: number, normalize: (s: string) => string, extra: Vars = {}) {
  const src = prepare(text, normalize);
  return math.evaluate(src, { ...buildScope(math, angle, vars, ans), ...extra });
}

function fmtReal(x: number, d: Disp): string {
  if (!Number.isFinite(x)) return String(x);
  if (Math.abs(x) < 1e-13) x = 0;
  const sup = (e: number) => `×10^${e}`;
  if (d.kind === "FIX") return x.toFixed(d.n);
  if (d.kind === "SCI") { const [m, e] = x.toExponential(Math.max(0, d.n - 1)).split("e"); return m + sup(Number(e)); }
  if (d.kind === "ENG") { if (x === 0) return "0"; const e = Math.floor(Math.log10(Math.abs(x)) / 3) * 3; return String(Number((x / 10 ** e).toPrecision(10))) + sup(e); }
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e10 || a < 1e-9)) { const [m, e] = x.toExponential(9).split("e"); return String(Number(m)) + sup(Number(e)); }
  return String(Number(x.toPrecision(10)));
}

export function formatValue(math: M, v: unknown, d: Disp, frac: boolean): string {
  if (typeof v === "number") { if (frac) { const s = asFraction(math, v); if (s) return s; } return fmtReal(v, d); }
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v && typeof v === "object") {
    const o = v as { tag?: string[]; vals?: number[]; re?: number; im?: number };
    if (o.tag && o.vals) return o.tag.map((t, i) => `${t}=${fmtReal(o.vals![i], d)}`).join("   ");
    if (typeof o.re === "number" && typeof o.im === "number") {
      if (Math.abs(o.im) < 1e-13) return fmtReal(o.re, d);
      const re = Math.abs(o.re) < 1e-13 ? "" : fmtReal(o.re, d); const im = fmtReal(Math.abs(o.im), d);
      return `${re}${re ? (o.im < 0 ? " − " : " + ") : (o.im < 0 ? "−" : "")}${im === "1" ? "" : im}i`;
    }
  }
  return String(v);
}

export function asFraction(math: M, n: number): string | null {
  if (!Number.isFinite(n) || Number.isInteger(n)) return null;
  try {
    const g = math.fraction(n); const N = Number(g.n), D = Number(g.d), S = Number(g.s);
    if (D > 100000 || Math.abs(N / D * S - n) > 1e-9 * Math.max(1, Math.abs(n))) return null;
    const w = Math.floor(N / D), r = N % D; const sg = S < 0 ? "−" : "";
    return w > 0 && r ? `${sg}${w} ${r}/${D}` : `${sg}${N}/${D}`;
  } catch { return null; }
}

export function toDMS(x: number): string {
  if (!Number.isFinite(x)) return String(x);
  const sg = x < 0 ? "−" : ""; let a = Math.abs(x); let d = Math.floor(a + 1e-12); a = (a - d) * 60; let m = Math.floor(a + 1e-9); let s = (a - m) * 60; s = Math.round(s * 1e6) / 1e6;
  if (s >= 60) { s -= 60; m += 1; } if (m >= 60) { m -= 60; d += 1; }
  return `${sg}${d}°${m}'${s}"`;
}

// ---- distributions ----
export function normCdf(math: M, z: number) { return 0.5 * (1 + math.erf(z / Math.SQRT2)); }
export function normPdf(z: number) { return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI); }
export function normInv(math: M, p: number) { let lo = -40, hi = 40; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (normCdf(math, m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }
export function binPmf(math: M, n: number, p: number, k: number) { if (k < 0 || k > n) return 0; return Number(math.combinations(n, k)) * p ** k * (1 - p) ** (n - k); }
export function poiPmf(lambda: number, k: number) { if (k < 0) return 0; let lg = -lambda + k * Math.log(lambda); for (let i = 2; i <= k; i++) lg -= Math.log(i); return Math.exp(lg); }

// ---- solver ----
export function symbolsOf(math: M, src: string): string[] {
  const out = new Set<string>();
  math.parse(src).traverse((n: M, path: string, parent: M) => { if (n.isSymbolNode && !(parent && parent.isFunctionNode && path === "fn")) out.add(n.name); });
  return [...out].filter(s => !["pi", "e", "i", "Ans", "E", "PI"].includes(s));
}
export function findRoots(g: (x: number) => number, lo: number, hi: number): number[] {
  const N = 6000, xs: number[] = [], ys: number[] = [];
  for (let i = 0; i <= N; i++) { const x = lo + (hi - lo) * i / N; xs.push(x); let y = NaN; try { y = g(x); } catch { y = NaN; } ys.push(y); }
  const roots: number[] = []; const add = (r: number) => { if (!roots.some(q => Math.abs(q - r) < 1e-7 * Math.max(1, Math.abs(r)))) roots.push(r); };
  for (let i = 0; i < N; i++) {
    const a = ys[i], b = ys[i + 1]; if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (a === 0) { add(xs[i]); continue; }
    if (a * b < 0) { let l = xs[i], h = xs[i + 1], fl = a; for (let k = 0; k < 100; k++) { const m = (l + h) / 2; const fm = g(m); if (!Number.isFinite(fm)) break; if (fl * fm <= 0) h = m; else { l = m; fl = fm; } } const r = (l + h) / 2; if (Math.abs(g(r)) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))) add(r); }
    else if (i > 0 && Number.isFinite(ys[i - 1]) && Math.abs(a) < Math.abs(ys[i - 1]) && Math.abs(a) <= Math.abs(b)) { // tangent root: refine local min of |f| by Newton on f'
      let x = xs[i]; for (let k = 0; k < 60; k++) { const h = 1e-6 * Math.max(1, Math.abs(x)); const f0 = g(x), d = (g(x + h) - g(x - h)) / (2 * h); if (Math.abs(d) < 1e-14) break; const nx = x - f0 / d; if (!Number.isFinite(nx)) break; x = nx; }
      if (Math.abs(g(x)) < 1e-9 && Math.abs(x - xs[i]) < (hi - lo) / N * 2) add(x); }
  }
  if (Number.isFinite(ys[N]) && ys[N] === 0) add(xs[N]);
  return roots.sort((p, q) => p - q);
}
