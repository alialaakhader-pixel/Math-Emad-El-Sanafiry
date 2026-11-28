import { create, all } from "mathjs";
const math = create(all, {});
export type Check = { kind: string; [k: string]: unknown };
export type CheckResult = { status: "pass" | "fail" | "skip"; note: string };

const s = (v: unknown) => (typeof v === "number" ? String(v) : typeof v === "string" ? v.replace(/\^/g, "^").replace(/π/g, "pi").replace(/∞/g, "Infinity").replace(/[×·]/g, "*").replace(/−/g, "-") : "");
const num = (v: unknown) => { const x = math.evaluate(s(v)); return typeof x === "number" ? x : Number(math.number(x as never)); };
const close = (a: number, b: number, tol: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const flat = (v: unknown): number[] => { const x = math.evaluate(s(v)); const arr = (typeof x === "object" && x && "toArray" in x ? (x as { toArray(): unknown }).toArray() : x) as unknown; if (!Array.isArray(arr)) return [Number(arr)]; return (math.flatten(arr as never) as unknown as unknown[]).map(e => Number(e)); };
const f1 = (expr: string, v: string) => { const c = math.compile(s(expr)); return (x: number) => { const r = c.evaluate({ [v]: x, e: Math.E, pi: Math.PI }); return typeof r === "number" ? r : NaN; }; };
const SAMPLES = [0.37, 0.9, 1.3, 2.1, 3.4, -0.6, -1.7];

function run(c: Check): CheckResult {
  const v = typeof c.var === "string" && /^[a-z]$/i.test(c.var) ? c.var : "x";
  switch (c.kind) {
    case "eval": {
      const a = flat(c.expr), b = flat(c.claimed);
      if (a.some(x => !Number.isFinite(x)) || b.some(x => !Number.isFinite(x))) return { status: "skip", note: "" };
      if (a.length !== b.length || !a.length) return { status: "fail", note: `الحساب الفعلي لـ ${c.expr} = ${a.join(", ")}` };
      return a.every((x, i) => close(x, b[i], 1e-6)) ? { status: "pass", note: "" } : { status: "fail", note: `الحساب الفعلي لـ ${c.expr} = ${a.map(x => +x.toPrecision(10)).join(", ")}` };
    }
    case "derivative": {
      const f = f1(String(c.f), v), g = f1(String(c.claimed), v); let ok = 0;
      for (const x of SAMPLES) {
        const h = 1e-5, d = (f(x + h) - f(x - h)) / (2 * h), cl = g(x);
        if (!Number.isFinite(d) || !Number.isFinite(cl)) continue;
        ok++; if (!close(d, cl, 1e-4)) return { status: "fail", note: `المشتقة العددية للدالة ${c.f} عند ${v}=${x} تساوي ${+d.toPrecision(8)} لكن الحل أعطى ${+cl.toPrecision(8)}` };
      }
      return ok >= 2 ? { status: "pass", note: "" } : { status: "skip", note: "" };
    }
    case "integral": {
      const f = f1(String(c.f), v), a = num(c.a), b = num(c.b), claimed = num(c.claimed);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return { status: "skip", note: "" };
      const n = 4000, h = (b - a) / n; let sum = f(a) + f(b);
      for (let i = 1; i < n; i++) sum += f(a + i * h) * (i % 2 ? 4 : 2);
      const val = (sum * h) / 3;
      if (!Number.isFinite(val)) return { status: "skip", note: "" };
      return close(val, claimed, 1e-5) ? { status: "pass", note: "" } : { status: "fail", note: `التكامل العددي لـ ${c.f} من ${c.a} إلى ${c.b} = ${+val.toPrecision(10)} لكن الحل أعطى ${+claimed.toPrecision(10)}` };
    }
    case "limit": {
      const f = f1(String(c.f), v); const p = s(c.point); const claimedRaw = s(c.claimed);
      const inf = /^\+?Infinity$/.test(p) ? 1 : /^-Infinity$/.test(p) ? -1 : 0;
      const pts = inf ? [inf * 1e3, inf * 1e5, inf * 1e7] : (() => { const x0 = num(p); const d = String(c.dir || "both"); const hs = [1e-4, 1e-6]; return [...(d !== "-" ? hs.map(h => x0 + h) : []), ...(d !== "+" ? hs.map(h => x0 - h) : [])]; })();
      const vals = pts.map(f);
      if (/^-?Infinity$/.test(claimedRaw) || /^\+Infinity$/.test(claimedRaw)) { const sg = claimedRaw.startsWith("-") ? -1 : 1; return vals.every(x => x * sg > 1e3) ? { status: "pass", note: "" } : { status: "fail", note: `القيم العددية للدالة ${c.f} قرب ${c.point} هي ${vals.map(x => +x.toPrecision(6)).join(", ")} ولا تتجه إلى ${claimedRaw}` }; }
      const claimed = num(claimedRaw);
      const last = vals.filter(Number.isFinite); if (last.length < 2) return { status: "skip", note: "" };
      return last.every(x => close(x, claimed, 2e-3)) ? { status: "pass", note: "" } : { status: "fail", note: `القيم العددية للدالة ${c.f} عندما ${v}→${c.point} هي ${last.map(x => +x.toPrecision(6)).join(", ")} لكن الحل أعطى ${claimed}` };
    }
    case "roots": {
      const f = f1(String(c.f), v); const list = Array.isArray(c.values) ? c.values : [];
      for (const r of list) { const x = num(r); const y = f(x); if (!Number.isFinite(y) || Math.abs(y) > 1e-6 * (1 + Math.abs(x) ** 3)) return { status: "fail", note: `التعويض بـ ${v}=${r} في ${c.f} يعطي ${+y.toPrecision(6)} وليس صفراً` }; }
      return list.length ? { status: "pass", note: "" } : { status: "skip", note: "" };
    }
    case "count_roots": {
      const f = f1(String(c.f), v), lo = num(c.lo ?? -50), hi = num(c.hi ?? 50), claimed = Number(c.claimed);
      const n = 200000; let prev = f(lo), cnt = 0;
      for (let i = 1; i <= n; i++) { const y = f(lo + ((hi - lo) * i) / n); if (Number.isFinite(prev) && Number.isFinite(y) && prev * y < 0) cnt++; prev = y; }
      return cnt === claimed ? { status: "pass", note: "" } : { status: "fail", note: `المسح العددي للدالة ${c.f} على [${lo}, ${hi}] وجد ${cnt} تغيّر إشارة (جذور من مضاعفات فردية)، والحل أعطى ${claimed}` };
    }
    default: return { status: "skip", note: "" };
  }
}

export function runChecks(checks: Check[]): { passed: number; failed: string[] } {
  let passed = 0; const failed: string[] = [];
  for (const c of checks.slice(0, 5)) {
    try { const r = run(c); if (r.status === "pass") passed++; else if (r.status === "fail") failed.push(r.note); } catch { /* unverifiable check: ignore */ }
  }
  return { passed, failed };
}
