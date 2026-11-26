"use client";
import { useMemo, useState } from "react";
import { normalizeArabicMath } from "@/lib/arabic-math";
import { binPmf, findRoots, normCdf, normInv, normPdf, poiPmf, prepare, symbolsOf, type Vars } from "@/lib/calc-engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type M = any;
type Run = (text: string, extra?: Vars) => unknown;
type Fmt = (v: unknown) => string;
const N = (s: string) => Number(normalizeArabicMath(s).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
const nums = (s: string) => s.split(/[\s,؛;]+/).filter(Boolean).map(N);
const Out = ({ lines, error }: { lines: string[]; error?: string }) => <div className="calc-out" dir="ltr">{error ? <p className="err">{error}</p> : lines.map((l, i) => <p key={i}>{l}</p>)}</div>;
const Field = ({ label, value, set, ph }: { label: string; value: string; set: (v: string) => void; ph?: string }) => <label><span className="small">{label}</span><input className="input" dir="ltr" inputMode="text" value={value} placeholder={ph} onChange={e => set(e.target.value)}/></label>;

export function SolvePanel({ math, runWith, initial, fmtV }: { math: M; runWith: Run; initial: string; fmtV: Fmt }) {
  const [text, setText] = useState(initial && !/^[\d.]+$/.test(initial) ? initial : "x^2-5x+6=0");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [target, setTarget] = useState("x"); const [lo, setLo] = useState("-100"); const [hi, setHi] = useState("100");
  const [out, setOut] = useState<string[]>([]); const [error, setError] = useState("");
  const parts = text.split("=");
  const src = parts.length === 2 ? `(${parts[0]})-(${parts[1]})` : text;
  const syms = useMemo(() => { try { return symbolsOf(math, prepare(src, normalizeArabicMath)); } catch { return []; } }, [math, src]);
  const others = syms.filter(s => s !== target);
  const extra = (): Vars => Object.fromEntries(others.map(s => [s, N(vals[s] ?? "0")]));
  function calc() {
    setError(""); setOut([]);
    try { const r = runWith(parts.length === 2 ? parts[0] : text, extra()); const r2 = parts.length === 2 ? runWith(parts[1], extra()) : null;
      setOut(r2 === null ? [`= ${fmtV(r)}`] : [`${fmtV(r)}  |  ${fmtV(r2)}`]); } catch (e) { setError(e instanceof Error ? e.message : "خطأ"); }
  }
  function solve() {
    setError(""); setOut([]);
    try {
      if (parts.length > 2) throw new Error("اكتب معادلة واحدة فقط (علامة = واحدة).");
      const ex = extra(); const g = (x: number) => { const r = runWith(src, { ...ex, [target]: x }); return typeof r === "number" ? r : NaN; };
      const roots = findRoots(g, N(lo), N(hi));
      setOut(roots.length ? roots.map((r, i) => `${target}${roots.length > 1 ? i + 1 : ""} = ${fmtV(r)}    (L−R = ${Math.abs(g(r)) < 1e-9 ? "0" : g(r).toExponential(2)})`) : ["لا يوجد حل حقيقي في هذا المدى. وسّع المدى أو جرّب معادلة أخرى."]);
    } catch (e) { setError(e instanceof Error ? e.message : "خطأ"); }
  }
  return <div className="calc-panel" dir="rtl">
    <p className="small">اكتب معادلة (مثل x^2−5x+6=0 أو sin(x)=0.5) لـ SOLVE، أو تعبيراً فيه متغيرات لـ CALC.</p>
    <input className="input" dir="ltr" value={text} onChange={e => setText(e.target.value)} placeholder="x^2-5x+6=0"/>
    <div className="calc-grid2">
      <label><span className="small">المجهول</span><select className="input" value={target} onChange={e => setTarget(e.target.value)}>{[...new Set([target, ...syms])].map(s => <option key={s}>{s}</option>)}</select></label>
      <div className="calc-grid2"><Field label="من" value={lo} set={setLo}/><Field label="إلى" value={hi} set={setHi}/></div>
    </div>
    {others.length > 0 && <div className="calc-grid">{others.map(s => <Field key={s} label={`${s} =`} value={vals[s] ?? ""} ph="0" set={v => setVals({ ...vals, [s]: v })}/>)}</div>}
    <div className="calc-row"><button type="button" className="btn btn-primary" onClick={solve}>SOLVE</button><button type="button" className="btn btn-outline" onClick={calc}>CALC</button></div>
    <Out lines={out} error={error}/>
  </div>;
}

export function ComplexPanel({ math, mode, fmtV }: { math: M; mode: string; fmtV: Fmt }) {
  const [a, setA] = useState("3"); const [b, setB] = useState("4"); const [c, setC] = useState("1"); const [d, setD] = useState("-2"); const [n, setN] = useState("2");
  const [out, setOut] = useState<string[]>([]); const [error, setError] = useState("");
  const k = mode === "DEG" ? 180 / Math.PI : mode === "GRAD" ? 200 / Math.PI : 1;
  const show = (z: M) => { const zz = math.complex(z); return [`z = ${fmtV(zz)}`, `|z| = ${fmtV(math.abs(zz))}   arg = ${fmtV(math.arg(zz) * k)} ${mode}`, `r∠θ = ${fmtV(math.abs(zz))} ∠ ${fmtV(math.arg(zz) * k)}`]; };
  function go(op: string) {
    setError("");
    try {
      const z1 = math.complex(N(a), N(b)), z2 = math.complex(N(c), N(d)); let r: M;
      switch (op) { case "+": r = math.add(z1, z2); break; case "−": r = math.subtract(z1, z2); break; case "×": r = math.multiply(z1, z2); break; case "÷": r = math.divide(z1, z2); break;
        case "pow": r = math.pow(z1, N(n)); break; case "zpow": r = math.pow(z1, z2); break; case "sqrt": r = math.sqrt(z1); break; case "conj": r = math.conj(z1); break; case "exp": r = math.exp(z1); break; case "ln": r = math.log(z1); break;
        case "roots": { const m = Math.round(N(n)); if (m < 2 || m > 12) throw new Error("n من 2 إلى 12"); const rr = Math.pow(math.abs(z1), 1 / m), th = math.arg(z1); setOut([...Array(m).keys()].map(j => `z${j + 1} = ${fmtV(math.complex({ r: rr, phi: (th + 2 * Math.PI * j) / m }))}`)); return; }
        default: r = z1; }
      setOut(show(r));
    } catch (e) { setOut([]); setError(e instanceof Error ? e.message : "خطأ"); }
  }
  const [ex, setEx] = useState("(1+i)^(2-i)");
  function evalEx() {
    setError("");
    try {
      const t = normalizeArabicMath(ex).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\u00d7/g, "*").replace(/\u00f7/g, "/").replace(/\u2212/g, "-");
      if (!t.trim() || t.length > 200 || !/^[\d\sa-zA-Z+\-*\/^().,]+$/.test(t)) throw new Error("عبارة غير صالحة.");
      const ok = ["i", "e", "pi", "sqrt", "abs", "arg", "conj", "re", "im", "exp", "log", "ln", "sin", "cos", "tan", "sinh", "cosh", "tanh", "nthRoot", "cbrt"];
      if ([...t.matchAll(/[a-zA-Z]+/g)].some(m => !ok.includes(m[0]))) throw new Error("دوال أو رموز غير مدعومة هنا.");
      const v = math.evaluate(t.replace(/\bln\(/g, "log("));
      if (v && typeof v === "object" && "re" in v && (Number.isNaN(v.re) || Number.isNaN(v.im))) throw new Error("القيمة غير معرّفة (مثل 0 أس عدد مركب)."); if (typeof v === "number" || (v && typeof v === "object" && "re" in v)) setOut(show(v)); else throw new Error("النتيجة ليست عدداً.");
    } catch (e) { setOut([]); setError(e instanceof Error ? e.message : "خطأ"); }
  }
  return <div className="calc-panel" dir="rtl">
    <p className="small">عبارة مركبة بأي أس (القيمة الرئيسية): مثل (2+3i)^4 أو (1+i)^(2-i) أو i^i</p>
    <div className="calc-row"><input className="input" dir="ltr" value={ex} onChange={e => setEx(e.target.value)} onKeyDown={e => { if (e.key === "Enter") evalEx(); }}/><button type="button" className="btn btn-primary" onClick={evalEx}>احسب</button></div>
    <div className="split-line"/>
    <p className="small">z₁ = a + bi ، z₂ = c + di</p>
    <div className="calc-grid4"><Field label="a" value={a} set={setA}/><Field label="b" value={b} set={setB}/><Field label="c" value={c} set={setC}/><Field label="d" value={d} set={setD}/></div>
    <div className="calc-row wrap">{["+", "−", "×", "÷"].map(o => <button type="button" key={o} onClick={() => go(o)}>z₁ {o} z₂</button>)}</div>
    <div className="calc-row wrap"><Field label="n" value={n} set={setN}/>{[["pow", "z₁ⁿ"], ["zpow", "z₁^z₂"], ["roots", "جذور n"], ["sqrt", "√z₁"], ["conj", "z̄₁"], ["exp", "e^z₁"], ["ln", "ln z₁"], ["", "تحليل z₁"]].map(([k2, l]) => <button type="button" key={l} onClick={() => go(k2)}>{l}</button>)}</div>
    <Out lines={out} error={error}/>
  </div>;
}

export function VectorPanel({ math, mode, fmtV }: { math: M; mode: string; fmtV: Fmt }) {
  const [A, setA] = useState("1 2 3"); const [B, setB] = useState("4 5 6"); const [out, setOut] = useState<string[]>([]); const [error, setError] = useState("");
  const k = mode === "DEG" ? 180 / Math.PI : mode === "GRAD" ? 200 / Math.PI : 1;
  const list = (v: number[]) => `(${v.map(x => fmtV(x)).join(", ")})`;
  function go(op: string) {
    setError(""); setOut([]);
    try {
      const a = nums(A), b = nums(B); if ([...a, ...b].some(x => !Number.isFinite(x))) throw new Error("أدخل أرقاماً صحيحة.");
      if (a.length < 2 || a.length > 3) throw new Error("المتجه بعدين أو ثلاثة أبعاد.");
      const same = () => { if (a.length !== b.length) throw new Error("المتجهان يجب أن يكونا من نفس البعد."); };
      const nrm = (v: number[]) => Math.hypot(...v); const dot = () => a.reduce((s, x, i) => s + x * b[i], 0);
      switch (op) {
        case "+": same(); setOut([`A + B = ${list(a.map((x, i) => x + b[i]))}`]); break;
        case "−": same(); setOut([`A − B = ${list(a.map((x, i) => x - b[i]))}`]); break;
        case "dot": same(); setOut([`A · B = ${fmtV(dot())}`]); break;
        case "cross": if (a.length !== 3 || b.length !== 3) throw new Error("الضرب الاتجاهي لمتجهين ثلاثيَّي الأبعاد."); setOut([`A × B = ${list(math.cross(a, b) as number[])}`]); break;
        case "norm": setOut([`|A| = ${fmtV(nrm(a))}`, b.length ? `|B| = ${fmtV(nrm(b))}` : ""]); break;
        case "angle": same(); { const c = dot() / (nrm(a) * nrm(b)); setOut([`θ = ${fmtV(Math.acos(Math.max(-1, Math.min(1, c))) * k)} ${mode}`]); } break;
        case "unit": setOut([`Â = ${list(a.map(x => x / nrm(a)))}`]); break;
        case "proj": same(); { const f = dot() / (nrm(b) ** 2); setOut([`proj_B A = ${list(b.map(x => x * f))}`]); } break;
        case "area": if (a.length !== 3 || b.length !== 3) throw new Error("مساحة متوازي الأضلاع لمتجهين ثلاثيَّي الأبعاد."); setOut([`المساحة = ${fmtV(nrm(math.cross(a, b) as number[]))}`]); break;
      }
    } catch (e) { setError(e instanceof Error ? e.message : "خطأ"); }
  }
  return <div className="calc-panel" dir="rtl">
    <div className="calc-grid2"><Field label="A (مثل 1 2 3)" value={A} set={setA}/><Field label="B" value={B} set={setB}/></div>
    <div className="calc-row wrap">{[["+", "A+B"], ["−", "A−B"], ["dot", "A·B"], ["cross", "A×B"], ["norm", "|A| |B|"], ["angle", "الزاوية"], ["unit", "Â"], ["proj", "المسقط"], ["area", "المساحة"]].map(([k2, l]) => <button type="button" key={k2} onClick={() => go(k2)}>{l}</button>)}</div>
    <Out lines={out} error={error}/>
  </div>;
}

export function DistPanel({ math }: { math: M }) {
  const [kind, setKind] = useState<"norm" | "bin" | "poi">("norm");
  const [mu, setMu] = useState("0"); const [sd, setSd] = useState("1"); const [x, setX] = useState("1.96"); const [p, setP] = useState("0.975"); const [a, setA] = useState("-1"); const [b, setB] = useState("1");
  const [n, setN] = useState("10"); const [pr, setPr] = useState("0.5"); const [k, setK] = useState("5"); const [lam, setLam] = useState("3");
  let lines: string[] = []; let error = "";
  const f = (v: number) => String(Number(v.toPrecision(10)));
  try {
    if (kind === "norm") {
      const m = N(mu), s = N(sd), xx = N(x); if (!(s > 0)) throw new Error("σ يجب أن يكون موجباً.");
      const z = (xx - m) / s; lines = [`z = ${f(z)}`, `P(X ≤ x) = ${f(normCdf(math, z))}`, `Q: P(X > x) = ${f(1 - normCdf(math, z))}`, `f(x) = ${f(normPdf(z) / s)}`,
        `P(${a} < X < ${b}) = ${f(normCdf(math, (N(b) - m) / s) - normCdf(math, (N(a) - m) / s))}`, `x عند المساحة ${p} = ${f(m + s * normInv(math, N(p)))}`];
    } else if (kind === "bin") {
      const nn = Math.round(N(n)), pp = N(pr), kk = Math.round(N(k)); if (nn < 0 || nn > 1000 || pp < 0 || pp > 1) throw new Error("n من 0 إلى 1000 و p بين 0 و1.");
      let cdf = 0; for (let i = 0; i <= kk; i++) cdf += binPmf(math, nn, pp, i);
      lines = [`P(X = ${kk}) = ${f(binPmf(math, nn, pp, kk))}`, `P(X ≤ ${kk}) = ${f(cdf)}`, `P(X ≥ ${kk}) = ${f(1 - cdf + binPmf(math, nn, pp, kk))}`, `μ = ${f(nn * pp)}   σ = ${f(Math.sqrt(nn * pp * (1 - pp)))}`];
    } else {
      const l = N(lam), kk = Math.round(N(k)); if (!(l > 0)) throw new Error("λ يجب أن يكون موجباً.");
      let cdf = 0; for (let i = 0; i <= kk; i++) cdf += poiPmf(l, i);
      lines = [`P(X = ${kk}) = ${f(poiPmf(l, kk))}`, `P(X ≤ ${kk}) = ${f(cdf)}`, `P(X ≥ ${kk}) = ${f(1 - cdf + poiPmf(l, kk))}`, `μ = σ² = ${f(l)}`];
    }
  } catch (e) { error = e instanceof Error ? e.message : "خطأ"; }
  return <div className="calc-panel" dir="rtl">
    <div className="calc-row wrap">{([["norm", "طبيعي"], ["bin", "ثنائي الحد"], ["poi", "بواسون"]] as const).map(([k2, l]) => <button type="button" key={k2} className={kind === k2 ? "on" : ""} onClick={() => setKind(k2)}>{l}</button>)}</div>
    {kind === "norm" && <><div className="calc-grid"><Field label="μ" value={mu} set={setMu}/><Field label="σ" value={sd} set={setSd}/><Field label="x" value={x} set={setX}/></div><div className="calc-grid"><Field label="من a" value={a} set={setA}/><Field label="إلى b" value={b} set={setB}/><Field label="المساحة p" value={p} set={setP}/></div></>}
    {kind === "bin" && <div className="calc-grid"><Field label="n" value={n} set={setN}/><Field label="p" value={pr} set={setPr}/><Field label="k" value={k} set={setK}/></div>}
    {kind === "poi" && <div className="calc-grid2"><Field label="λ" value={lam} set={setLam}/><Field label="k" value={k} set={setK}/></div>}
    <Out lines={lines} error={error}/>
  </div>;
}

export function TablePanel({ runWith, fmtV }: { runWith: Run; fmtV: Fmt }) {
  const [f, setF] = useState("x^2-2x"); const [g, setG] = useState(""); const [s, setS] = useState("-3"); const [e, setE] = useState("3"); const [st, setSt] = useState("1");
  const rows: { x: string; a: string; b?: string }[] = []; let error = "";
  try {
    const s0 = N(s), e0 = N(e), step = N(st);
    if (!Number.isFinite(s0 + e0 + step) || step === 0 || (e0 - s0) / step < 0 || (e0 - s0) / step > 60) throw new Error("تأكد من البداية والنهاية والخطوة (حتى 60 صفاً).");
    const ev = (src: string, x: number) => { try { const r = runWith(src, { x }); return fmtV(r); } catch { return "ERROR"; } };
    for (let i = 0; i <= Math.round((e0 - s0) / step); i++) { const x = s0 + i * step; rows.push({ x: String(Number(x.toPrecision(10))), a: ev(f, x), b: g.trim() ? ev(g, x) : undefined }); }
  } catch (er) { error = er instanceof Error ? er.message : "خطأ"; }
  return <div className="calc-panel" dir="rtl">
    <div className="calc-grid2"><Field label="f(x)" value={f} set={setF}/><Field label="g(x) (اختياري)" value={g} set={setG}/></div>
    <div className="calc-grid"><Field label="البداية" value={s} set={setS}/><Field label="النهاية" value={e} set={setE}/><Field label="الخطوة" value={st} set={setSt}/></div>
    {error ? <Out lines={[]} error={error}/> : <div className="calc-out" dir="ltr" style={{ maxHeight: 260, overflow: "auto" }}><table style={{ width: "100%", textAlign: "center" }}><thead><tr><th>x</th><th>f(x)</th>{g.trim() && <th>g(x)</th>}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}><td>{r.x}</td><td>{r.a}</td>{r.b !== undefined && <td>{r.b}</td>}</tr>)}</tbody></table></div>}
  </div>;
}
