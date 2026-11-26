"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calculator, X, History, Delete, Trash2 } from "lucide-react";
import { normalizeArabicMath } from "@/lib/arabic-math";
import { solveCubic, solveLinearText, solveQuadratic, solveSystem2, solveSystem3, toAr, type Solution } from "@/lib/solver-steps";

type Mode = "DEG" | "RAD" | "GRAD";
type Tab = "sci" | "graph" | "eq" | "mat" | "stat" | "conv" | "base" | "calc";
type MathApi = typeof import("mathjs");

const TABS: { id: Tab; label: string }[] = [
  { id: "sci", label: "علمية" }, { id: "graph", label: "رسم" }, { id: "eq", label: "حل المجاهيل" }, { id: "mat", label: "مصفوفات" },
  { id: "stat", label: "إحصاء" }, { id: "conv", label: "تحويل" }, { id: "base", label: "أنظمة العد" }, { id: "calc", label: "تفاضل وتكامل" },
];

const UNITS: Record<string, { label: string; units: Record<string, [string, number]> }> = {
  length: { label: "الطول", units: { m: ["متر", 1], km: ["كيلومتر", 1000], cm: ["سنتيمتر", 0.01], mm: ["مليمتر", 0.001], mi: ["ميل", 1609.344], ft: ["قدم", 0.3048], inch: ["بوصة", 0.0254] } },
  mass: { label: "الكتلة", units: { kg: ["كيلوغرام", 1], g: ["غرام", 0.001], t: ["طن", 1000], lb: ["رطل", 0.45359237], oz: ["أوقية", 0.028349523] } },
  time: { label: "الزمن", units: { s: ["ثانية", 1], min: ["دقيقة", 60], h: ["ساعة", 3600], d: ["يوم", 86400] } },
  area: { label: "المساحة", units: { m2: ["م²", 1], km2: ["كم²", 1e6], cm2: ["سم²", 1e-4], ha: ["هكتار", 1e4] } },
  energy: { label: "الطاقة", units: { J: ["جول", 1], kJ: ["كيلوجول", 1000], cal: ["سعر", 4.184], kWh: ["كيلوواط ساعة", 3.6e6], eV: ["إلكترون فولت", 1.602176634e-19] } },
  temp: { label: "الحرارة", units: { C: ["سيلزيوس", 1], F: ["فهرنهايت", 1], K: ["كلفن", 1] } },
};

const CONSTS: [string, string, string][] = [
  ["تسارع الجاذبية g", "9.80665", "9.80665 m/s²"], ["سرعة الضوء c", "299792458", "3×10⁸ m/s"], ["ثابت بلانك h", "6.62607015e-34", "6.626×10⁻³⁴ J·s"],
  ["ثابت الجذب G", "6.6743e-11", "6.674×10⁻¹¹"], ["شحنة الإلكترون e", "1.602176634e-19", "1.602×10⁻¹⁹ C"], ["كتلة الإلكترون", "9.1093837e-31", "9.109×10⁻³¹ kg"],
  ["كتلة البروتون", "1.67262192e-27", "1.673×10⁻²⁷ kg"], ["عدد أفوجادرو", "6.02214076e23", "6.022×10²³"], ["ثابت الغاز R", "8.314462618", "8.314 J/mol·K"],
  ["ثابت بولتزمان k", "1.380649e-23", "1.381×10⁻²³ J/K"], ["ثابت كولوم k", "8.9875517923e9", "8.988×10⁹"], ["سماحية الفراغ ε₀", "8.8541878128e-12", "8.854×10⁻¹² F/m"],
];
const fmt = (n: unknown): string => {
  if (typeof n === "number") { if (!Number.isFinite(n)) return String(n); const r = Math.abs(n) < 1e-12 ? 0 : n; return String(Number(r.toPrecision(12))); }
  if (n && typeof n === "object" && "toString" in n) return String(n);
  return String(n);
};

export default function FloatingCalculator() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("sci");
  const [math, setMath] = useState<MathApi | null>(null);
  const [expr, setExpr] = useState("");
  const [mode, setMode] = useState<Mode>("DEG");
  const [shift, setShift] = useState(false);
  const [hyp, setHyp] = useState(false);
  const [frac, setFrac] = useState(false);
  const [showConst, setShowConst] = useState(false);
  const [history, setHistory] = useState<{ e: string; r: string }[]>([]);
  const [showHist, setShowHist] = useState(false);
  const [ans, setAns] = useState("0");
  const [memory, setMemory] = useState(0);
  const [err, setErr] = useState("");
  const [arabicDigits, setArabicDigits] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { setHistory(JSON.parse(localStorage.getItem("calc-history") || "[]")); setMemory(Number(localStorage.getItem("calc-mem") || 0)); } catch {} }, []);
  useEffect(() => { if (open && !math) import("mathjs").then(m => setMath(m)); }, [open, math]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  useEffect(() => { if (open && tab === "sci") setTimeout(() => inputRef.current?.focus(), 60); }, [open, tab]);

  const scope = useMemo(() => {
    if (!math) return null;
    const f = mode === "DEG" ? Math.PI / 180 : mode === "GRAD" ? Math.PI / 200 : 1;
    const rad = (x: number) => x * f; const back = (x: number) => x / f;
    return {
      sin: (x: number) => math.sin(rad(x)), cos: (x: number) => math.cos(rad(x)), tan: (x: number) => math.tan(rad(x)),
      asin: (x: number) => back(Number(math.asin(x))), acos: (x: number) => back(Number(math.acos(x))), atan: (x: number) => back(Number(math.atan(x))),
      sec: (x: number) => 1 / Math.cos(rad(x)), csc: (x: number) => 1 / Math.sin(rad(x)), cot: (x: number) => 1 / Math.tan(rad(x)),
      ln: (x: number) => Math.log(x), sinh: (x: number) => Math.sinh(x), cosh: (x: number) => Math.cosh(x), tanh: (x: number) => Math.tanh(x), asinh: (x: number) => Math.asinh(x), acosh: (x: number) => Math.acosh(x), atanh: (x: number) => Math.atanh(x), nthRoot: (x: number, n: number) => Number(math.nthRoot(x, n)), Ans: Number(ans) || 0,
      nPr: (n: number, r: number) => math.permutations(n, r), nCr: (n: number, r: number) => math.combinations(n, r),
      rand: () => Math.random(),
    };
  }, [math, mode, ans]);

  const run = useCallback((text: string) => {
    if (!math || !scope) throw new Error("جارٍ تحميل المحرك...");
    const src = normalizeArabicMath(text).replace(/√/g, "sqrt").replace(/∛/g, "cbrt").replace(/(\d)(?=pi|e\b|sqrt|sin|cos|tan|log|ln)/g, "$1*");
    if (!src || src.length > 300) throw new Error("تعبير غير صالح.");
    if (/[;=\[\]{}'"`\\]/.test(src) || /\b(import|createUnit|evaluate|parse|compile|simplify|derivative|function|help)\b/i.test(src)) throw new Error("رموز غير مسموحة.");
    return math.evaluate(src, { ...scope });
  }, [math, scope]);

  const preview = useMemo(() => { if (!expr.trim() || !math) return ""; try { const r = run(expr); if (typeof r === "function" || r === undefined) return ""; return fmt(r); } catch { return ""; } }, [expr, run, math]);

  const asFrac = (v: string) => { if (!frac || !math) return v; const n = Number(v); if (!Number.isFinite(n) || Number.isInteger(n)) return v; try { const g = math.fraction(n) as unknown as { n: number | bigint; d: number | bigint; s: number | bigint }; const f = { n: Number(g.n), d: Number(g.d), s: Number(g.s) }; if (f.d > 100000 || Math.abs(f.n / f.d - n) > 1e-9 * Math.max(1, Math.abs(n))) return v; const w = Math.floor(f.n / f.d), r = f.n % f.d; return (f.s < 0 ? "-" : "") + (w > 0 && r > 0 ? w + " " + r + "/" + f.d : f.n + "/" + f.d); } catch { return v; } };
  const show = (v: string) => (arabicDigits ? v.replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]) : v);

  function equals() {
    setErr("");
    try {
      const r = run(expr); const out = fmt(r);
      if (out === "undefined" || out === "NaN") throw new Error("النتيجة غير معرّفة.");
      const next = [{ e: expr, r: out }, ...history].slice(0, 40);
      setHistory(next); localStorage.setItem("calc-history", JSON.stringify(next)); setAns(out); setExpr(out);
    } catch (e) { setErr(e instanceof Error ? e.message.slice(0, 120) : "خطأ في التعبير."); }
  }
  const caret = useRef<number | null>(null);
  const put = (str: string) => { setErr(""); const el = inputRef.current; const a = caret.current ?? expr.length; const b = el && el.selectionStart !== el.selectionEnd && document.activeElement === el ? (el.selectionEnd ?? a) : a; const st = el && document.activeElement === el ? (el.selectionStart ?? a) : a; const n = expr.slice(0, st) + str + expr.slice(b); setExpr(n); caret.current = st + str.length; setTimeout(() => { if (el) { el.setSelectionRange(st + str.length, st + str.length); } }, 0); };
  const moveCaret = (d: number) => { const el = inputRef.current; const c = Math.max(0, Math.min(expr.length, (caret.current ?? expr.length) + d)); caret.current = c; if (el) { el.setSelectionRange(c, c); } };
  const backspace = () => { const c = caret.current ?? expr.length; if (c <= 0) return; setExpr(expr.slice(0, c - 1) + expr.slice(c)); caret.current = c - 1; setTimeout(() => inputRef.current?.setSelectionRange(c - 1, c - 1), 0); };
  const memApply = (k: string) => { const v = Number(preview || expr) || 0; const n = k === "MC" ? 0 : k === "M+" ? memory + v : k === "M-" ? memory - v : memory; if (k === "MR") put(String(memory)); else { setMemory(n); localStorage.setItem("calc-mem", String(n)); } };

  const h = hyp ? "h" : "";
  const keys: [string, string, string?][] = [
    [shift ? `asin${h}(` : `sin${h}(`, shift ? `sin⁻¹` : "sin" + h], [shift ? `acos${h}(` : `cos${h}(`, shift ? "cos⁻¹" : "cos" + h], [shift ? `atan${h}(` : `tan${h}(`, shift ? "tan⁻¹" : "tan" + h], [shift ? "10^(" : "log10(", shift ? "10ˣ" : "log"], [shift ? "e^(" : "ln(", shift ? "eˣ" : "ln"], [shift ? "cbrt(" : "sqrt(", shift ? "∛" : "√"],
    [shift ? "^3" : "^2", shift ? "x³" : "x²"], ["^", "xʸ"], ["^(-1)", "x⁻¹"], ["!", "n!"], ["abs(", "|x|"], ["nthRoot(", "ʸ√x"],
    ["(", "("], [")", ")"], ["e", "×10ˣ"], ["pi", "π"], ["Ans", "Ans"], ["HYP", "hyp"],
    ["7", "7", "n"], ["8", "8", "n"], ["9", "9", "n"], ["DEL", "⌫", "op"], ["AC", "AC", "op"], ["SD", "S⇔D"],
    ["4", "4", "n"], ["5", "5", "n"], ["6", "6", "n"], ["*", "×", "op"], ["/", "÷", "op"], ["nCr(", "nCr"],
    ["1", "1", "n"], ["2", "2", "n"], ["3", "3", "n"], ["+", "+", "op"], ["-", "−", "op"], ["nPr(", "nPr"],
    ["0", "0", "n"], [".", ".", "n"], ["L", "◀"], ["R", "▶"], ["%", "%"], ["=", "=", "eq"],
  ];
  const press = (k: string) => {
    if (k === "AC") { setExpr(""); setErr(""); caret.current = 0; } else if (k === "DEL") backspace(); else if (k === "=") equals();
    else if (k === "HYP") setHyp(!hyp); else if (k === "SD") setFrac(!frac); else if (k === "L") moveCaret(-1); else if (k === "R") moveCaret(1);
    else put(k);
  };

  return <>
    <button type="button" className="calc-fab" aria-label="فتح الآلة الحاسبة" title="الآلة الحاسبة" onClick={() => setOpen(o => !o)}><Calculator size={26}/><span className="calc-fab-ring" aria-hidden="true"/></button>
    {open && <div className="calc-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="calc-modal glass" role="dialog" aria-modal="true" aria-label="الآلة الحاسبة المتطورة" ref={dialogRef} dir="rtl">
        <div className="calc-head"><strong><Calculator size={18}/> الآلة الحاسبة المتطورة</strong><span className="calc-solar" aria-hidden="true"/><em className="calc-model" dir="ltr">SANAFIRY · fx-ADVANCED</em><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={18}/></button></div>
        <div className="calc-tabs" role="tablist">{TABS.map(t => <button type="button" role="tab" aria-selected={tab === t.id} key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
        {!math && <div className="calc-loading">جارٍ تحميل محرك الحساب...</div>}
        {math && tab === "sci" && <>
          <div className="calc-display" dir="ltr">
            <input ref={inputRef} className="calc-input" onSelect={e => { caret.current = e.currentTarget.selectionStart; }} value={expr} onChange={e => { setExpr(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); equals(); } }} placeholder="0" inputMode="none" aria-label="التعبير الرياضي" spellCheck={false}/>
            <div className={`calc-result ${err ? "err" : ""}`}>{err || (preview ? "= " + show(asFrac(preview)) : "\u00a0")}</div>
          </div>
          <div className="calc-toolbar">
            <button type="button" className={shift ? "on" : ""} onClick={() => setShift(!shift)}>SHIFT</button>
            <button type="button" onClick={() => setMode(mode === "DEG" ? "RAD" : mode === "RAD" ? "GRAD" : "DEG")}>{mode}</button>
            <button type="button" className={arabicDigits ? "on" : ""} onClick={() => setArabicDigits(!arabicDigits)}>١٢٣</button>
            {["MC", "MR", "M+", "M-"].map(k => <button type="button" key={k} onClick={() => memApply(k)}>{k}</button>)}
            <button type="button" className={showConst ? "on" : ""} onClick={() => setShowConst(!showConst)}>ثوابت</button>
            <button type="button" className={showHist ? "on" : ""} onClick={() => setShowHist(!showHist)} aria-label="السجل"><History size={14}/></button>
          </div>
          {showConst && <div className="calc-consts" dir="rtl">{CONSTS.map(([n, v, sym]) => <button type="button" key={n} onClick={() => { put(v); setShowConst(false); }}><span>{n}</span><b dir="ltr">{sym}</b></button>)}</div>}
          {memory !== 0 && <div className="calc-mem">M = {show(fmt(memory))}</div>}
          {showHist ? <div className="calc-history">{history.length ? <>{history.map((h, i) => <button type="button" key={i} onClick={() => { setExpr(h.r); setShowHist(false); }}><span dir="ltr">{h.e}</span><b dir="ltr">= {show(h.r)}</b></button>)}<button type="button" className="calc-clear" onClick={() => { setHistory([]); localStorage.removeItem("calc-history"); }}><Trash2 size={13}/> مسح السجل</button></> : <p className="small">لا توجد عمليات سابقة.</p>}</div>
            : <div className="calc-keys">{keys.map(([k, l, c], i) => <button type="button" key={i} className={`k-${c || "fn"}`} onClick={() => press(k)}>{k === "DEL" ? <Delete size={16}/> : show(l)}</button>)}</div>}
        </>}
        {math && tab === "graph" && <MiniGraph math={math} mode={mode}/>}
        {math && tab === "eq" && <EquationPanel math={math}/>}
        {math && tab === "mat" && <MatrixPanel math={math}/>}
        {math && tab === "stat" && <StatPanel math={math}/>}
        {math && tab === "conv" && <ConvertPanel/>}
        {math && tab === "base" && <BasePanel/>}
        {math && tab === "calc" && <CalculusPanel math={math}/>}
      </div>
    </div>}
  </>;
}

function Out({ lines, error }: { lines: string[]; error?: string }) {
  return <div className="calc-out" dir="ltr">{error ? <p className="err">{error}</p> : lines.map((l, i) => <p key={i}>{l}</p>)}</div>;
}
const nums = (s: string) => s.split(/[\s,؛;]+/).filter(Boolean).map(x => Number(normalizeArabicMath(x))).filter(x => Number.isFinite(x));

function MiniGraph({ math, mode }: { math: MathApi; mode: Mode }) {
  const [f, setF] = useState("sin(x)"); const [range, setRange] = useState(6); const ref = useRef<HTMLCanvasElement>(null); const [error, setError] = useState("");
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.width, H = c.height; ctx.clearRect(0, 0, W, H);
    let code: { evaluate: (s: object) => unknown };
    try { const src = normalizeArabicMath(f).replace(/√/g, "sqrt"); if (/[;=\[\]{}'"`\\]/.test(src) || src.length > 120) throw new Error("x"); code = math.compile(src) as typeof code; setError(""); } catch { setError("دالة غير صالحة. مثال: x^2-4 أو sin(x)"); return; }
    const k = mode === "DEG" ? Math.PI / 180 : mode === "GRAD" ? Math.PI / 200 : 1;
    const sc = { sin: (x: number) => Math.sin(x * k), cos: (x: number) => Math.cos(x * k), tan: (x: number) => Math.tan(x * k), ln: Math.log };
    const xs = (x: number) => (x + range) / (2 * range) * W; const ys = (y: number) => H / 2 - y / range * (H / 2);
    ctx.strokeStyle = "rgba(160,180,230,.18)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = -Math.floor(range); i <= range; i++) { ctx.moveTo(xs(i), 0); ctx.lineTo(xs(i), H); ctx.moveTo(0, ys(i)); ctx.lineTo(W, ys(i)); } ctx.stroke();
    ctx.strokeStyle = "rgba(200,215,255,.6)"; ctx.beginPath(); ctx.moveTo(xs(0), 0); ctx.lineTo(xs(0), H); ctx.moveTo(0, ys(0)); ctx.lineTo(W, ys(0)); ctx.stroke();
    ctx.strokeStyle = "#7de2f0"; ctx.lineWidth = 2.2; ctx.beginPath(); let pen = false;
    for (let px = 0; px <= W; px += 1) { const x = px / W * 2 * range - range; let y = NaN; try { y = Number(code.evaluate({ ...sc, x })); } catch { y = NaN; } if (!Number.isFinite(y) || Math.abs(y) > range * 6) { pen = false; continue; } if (pen) ctx.lineTo(px, ys(y)); else { ctx.moveTo(px, ys(y)); pen = true; } }
    ctx.stroke();
  }, [f, range, math, mode]);
  return <div className="calc-panel"><label className="small">y = f(x)</label><input className="input" dir="ltr" value={f} onChange={e => setF(e.target.value)}/><canvas ref={ref} width={560} height={340} className="calc-canvas" aria-label="رسم الدالة"/>{error && <p className="err small">{error}</p>}<div className="calc-row"><button type="button" onClick={() => setRange(r => Math.max(1, r / 1.5))}>تكبير +</button><button type="button" onClick={() => setRange(r => Math.min(200, r * 1.5))}>تصغير −</button><span className="small">المدى: ±{range.toFixed(1)}</span></div></div>;
}

function EquationPanel({ math }: { math: MathApi }) {
  void math;
  const [kind, setKind] = useState<"text" | "quad" | "cubic" | "sys2" | "sys3">("text"); const [arabic, setArabic] = useState(false);
  const [txt, setTxt] = useState("2س² − 5س + 3 = 0");
  const [v, setV] = useState(["1", "-3", "2", "0", "0", "0", "0", "0", "0", "0", "0", "0"]);
  const set = (i: number, x: string) => setV(v.map((o, j) => j === i ? x : o));
  const num = (i: number) => Number(normalizeArabicMath(v[i] || "0"));
  const sol: Solution | null = useMemo(() => {
    try {
      if (kind === "text") return txt.trim() ? solveLinearText(txt) : null;
      const n = v.map((_, i) => Number(normalizeArabicMath(v[i] || "0")));
      const need = kind === "quad" ? 3 : kind === "cubic" ? 4 : kind === "sys2" ? 6 : 12;
      if (n.slice(0, need).some(x => !Number.isFinite(x))) return null;
      if (kind === "quad") return solveQuadratic(n[0], n[1], n[2]);
      if (kind === "cubic") return solveCubic(n[0], n[1], n[2], n[3]);
      if (kind === "sys2") return solveSystem2(n[0], n[1], n[2], n[3], n[4], n[5]);
      return solveSystem3([n.slice(0, 4), n.slice(4, 8), n.slice(8, 12)]);
    } catch { return { title: "", steps: [], answers: [], error: "تعذر الحل، راجع المدخلات." }; }
  }, [kind, txt, v]);
  void num;
  const labels = kind === "quad" ? ["a", "b", "c"] : kind === "cubic" ? ["a", "b", "c", "d"] : kind === "sys2" ? ["a₁", "b₁", "c₁", "a₂", "b₂", "c₂"] : ["س", "ص", "ع", "=", "س", "ص", "ع", "=", "س", "ص", "ع", "="];
  const shape = kind === "quad" ? "a س² + b س + c = 0" : kind === "cubic" ? "a س³ + b س² + c س + d = 0" : kind === "sys2" ? "a₁ س + b₁ ص = c₁   ،   a₂ س + b₂ ص = c₂" : "معاملات س، ص، ع ثم الثابت في كل معادلة";
  const T = (x: string) => (arabic ? toAr(x) : x);
  return <div className="calc-panel solver" dir="rtl">
    <div className="calc-row wrap">{([["text", "معادلة نصية"], ["quad", "درجة ٢"], ["cubic", "درجة ٣"], ["sys2", "معادلتان"], ["sys3", "٣ معادلات"]] as const).map(([k, l]) => <button key={k} type="button" className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{l}</button>)}<button type="button" className={arabic ? "on" : ""} onClick={() => setArabic(!arabic)}>{arabic ? "٠١٢" : "012"}</button></div>
    {kind === "text" ? <><label className="small">اكتب المعادلة بمجهول واحد (س أو ص أو x)، مثل: ٣س + ٧ = ١٦ أو س² − ٥س + ٦ = ٠</label><input className="input" value={txt} onChange={e => setTxt(e.target.value)} aria-label="المعادلة"/></>
      : <><p className="small">{shape}</p>{kind === "sys3" ? <div className="calc-grid4">{[0, 1, 2].map(r => [0, 1, 2, 3].map(c => <label key={r * 4 + c}><span>{["س", "ص", "ع", "ثابت"][c]}{c === 3 ? "" : ""}</span><input className="input" dir="ltr" inputMode="decimal" value={v[r * 4 + c]} onChange={e => set(r * 4 + c, e.target.value)}/></label>))}</div>
        : <div className="calc-grid">{labels.map((l, i) => <label key={i}><span>{l}</span><input className="input" dir="ltr" inputMode="decimal" value={v[i]} onChange={e => set(i, e.target.value)}/></label>)}</div>}</>}
    {sol?.error && <div className="calc-out"><p className="err">{sol.error}</p></div>}
    {sol && !sol.error && <div className="solver-steps">
      <h4>{sol.title}</h4>
      <ol>{sol.steps.map((st, i) => { const t = T(st); const m = t.match(/^([^:]{2,40}):\s*(.+)$/); if (m && !/[\u0600-\u06FF]{3,}/.test(m[2])) return <li key={i}><span>{m[1]}:</span> <bdi dir="ltr" className="fx">{m[2]}</bdi></li>; return /^[\u0600-\u06FF]{3,}/.test(t) ? <li key={i}>{t}</li> : <li key={i} dir="ltr" className="ltr-step">{t}</li>; })}</ol>
      <div className="solver-answer"><b>الحل:</b>{sol.answers.map((a, i) => <span key={i}>{T(a)}</span>)}</div>
    </div>}
  </div>;
}

function MatrixPanel({ math }: { math: MathApi }) {
  const [n, setN] = useState(2); const [A, setA] = useState("1 2\n3 4"); const [B, setB] = useState("0 1\n1 0"); const [res, setRes] = useState<string[]>([]); const [error, setError] = useState("");
  const parse = (s: string) => s.trim().split(/\n+/).map(r => r.trim().split(/[\s,]+/).map(x => Number(normalizeArabicMath(x))));
  function go(op: string) {
    setError(""); try {
      const a = parse(A), b = parse(B); if ([...a.flat(), ...b.flat()].some(x => !Number.isFinite(x))) throw new Error("أدخل أرقاماً صحيحة.");
      if (a.length > 6 || a[0].length > 6) throw new Error("الحد الأقصى 6×6.");
      let r: unknown;
      switch (op) { case "add": r = math.add(a, b); break; case "sub": r = math.subtract(a, b); break; case "mul": r = math.multiply(a, b); break; case "det": r = math.det(a); break; case "inv": r = math.inv(a); break; case "T": r = math.transpose(a); break; case "tr": r = math.trace(a); break; default: r = ""; }
      const arr = r as unknown; if (Array.isArray(arr)) setRes((arr as number[][]).map(row => row.map(x => fmt(x)).join("   "))); else setRes([fmt(arr)]);
    } catch (e) { setRes([]); setError(e instanceof Error ? (/singular|Cannot calculate inverse/i.test(e.message) ? "المصفوفة منفردة (لا معكوس لها)." : "تحقق من الأبعاد: " + e.message.slice(0, 80)) : "خطأ"); }
  }
  void n; void setN;
  return <div className="calc-panel"><div className="calc-grid2"><label><span>A</span><textarea className="input" dir="ltr" rows={4} value={A} onChange={e => setA(e.target.value)}/></label><label><span>B</span><textarea className="input" dir="ltr" rows={4} value={B} onChange={e => setB(e.target.value)}/></label></div>
    <div className="calc-row wrap">{[["add", "A+B"], ["sub", "A−B"], ["mul", "A×B"], ["det", "det A"], ["inv", "A⁻¹"], ["T", "Aᵀ"], ["tr", "tr A"]].map(([k, l]) => <button type="button" key={k} onClick={() => go(k)}>{l}</button>)}</div>
    <Out lines={res} error={error}/></div>;
}

function StatPanel({ math }: { math: MathApi }) {
  const [t, setT] = useState("12 15 11 18 20 15 9"); const [t2, setT2] = useState("");
  const d = nums(t); const out: string[] = [];
  if (d.length) {
    const sorted = [...d].sort((a, b) => a - b); const freq = new Map<number, number>(); d.forEach(x => freq.set(x, (freq.get(x) || 0) + 1)); const mx = Math.max(...freq.values());
    out.push(`n = ${d.length}`, `Σx = ${fmt(math.sum(d))}`, `المتوسط = ${fmt(math.mean(d))}`, `الوسيط = ${fmt(math.median(d))}`, `المنوال = ${mx > 1 ? [...freq].filter(([, c]) => c === mx).map(([x]) => x).join(", ") : "لا يوجد"}`, `المدى = ${fmt(sorted[sorted.length - 1] - sorted[0])}`, `Min = ${fmt(sorted[0])} , Max = ${fmt(sorted[sorted.length - 1])}`);
    if (d.length > 1) out.push(`التباين (عينة) = ${fmt(math.variance(d))}`, `الانحراف المعياري (عينة) σn-1 = ${fmt(math.std(d))}`);
    out.push(`التباين (مجتمع) = ${fmt(math.variance(d, "uncorrected"))}`, `الانحراف المعياري (مجتمع) σn = ${fmt(math.std(d, "uncorrected"))}`);
    const e = nums(t2);
    if (e.length === d.length && d.length > 1) { const mx2 = Number(math.mean(d)), my = Number(math.mean(e)); let sxy = 0, sxx = 0, syy = 0; d.forEach((x, i) => { sxy += (x - mx2) * (e[i] - my); sxx += (x - mx2) ** 2; syy += (e[i] - my) ** 2; }); if (sxx && syy) { const b = sxy / sxx; out.push(`الانحدار: y = ${fmt(b)}x + ${fmt(my - b * mx2)}`, `معامل الارتباط r = ${fmt(sxy / Math.sqrt(sxx * syy))}`); } }
  }
  return <div className="calc-panel"><label className="small">القيم x (مفصولة بمسافة أو فاصلة)</label><textarea className="input" dir="ltr" rows={2} value={t} onChange={e => setT(e.target.value)}/><label className="small">قيم y (اختياري للانحدار والارتباط)</label><textarea className="input" dir="ltr" rows={2} value={t2} onChange={e => setT2(e.target.value)}/><Out lines={out} error={t.trim() && !d.length ? "أدخل أرقاماً." : ""}/></div>;
}

function ConvertPanel() {
  const [cat, setCat] = useState("length"); const [from, setFrom] = useState("m"); const [to, setTo] = useState("km"); const [val, setVal] = useState("1");
  const units = UNITS[cat].units; const x = Number(normalizeArabicMath(val));
  let out = "";
  if (Number.isFinite(x) && units[from] && units[to]) {
    if (cat === "temp") { const c = from === "C" ? x : from === "F" ? (x - 32) * 5 / 9 : x - 273.15; out = fmt(to === "C" ? c : to === "F" ? c * 9 / 5 + 32 : c + 273.15); }
    else out = fmt(x * units[from][1] / units[to][1]);
  }
  const pick = (c: string) => { setCat(c); const k = Object.keys(UNITS[c].units); setFrom(k[0]); setTo(k[1]); };
  return <div className="calc-panel"><div className="calc-row wrap">{Object.entries(UNITS).map(([k, u]) => <button type="button" key={k} className={cat === k ? "on" : ""} onClick={() => pick(k)}>{u.label}</button>)}</div>
    <input className="input" dir="ltr" inputMode="decimal" value={val} onChange={e => setVal(e.target.value)}/>
    <div className="calc-grid2"><select className="input" value={from} onChange={e => setFrom(e.target.value)}>{Object.entries(units).map(([k, u]) => <option key={k} value={k}>{u[0]}</option>)}</select><select className="input" value={to} onChange={e => setTo(e.target.value)}>{Object.entries(units).map(([k, u]) => <option key={k} value={k}>{u[0]}</option>)}</select></div>
    <Out lines={out ? [`${val} ${units[from][0]} = ${out} ${units[to][0]}`] : []}/></div>;
}

function BasePanel() {
  const [base, setBase] = useState(10); const [val, setVal] = useState("255");
  let n: bigint | null = null; try { const clean = val.trim().toLowerCase(); if (clean) { const digits = "0123456789abcdefghijklmnopqrstuvwxyz".slice(0, base); if ([...clean].every(ch => digits.includes(ch)) && clean.length < 60) { n = BigInt(0); for (const ch of clean) n = n * BigInt(base) + BigInt(digits.indexOf(ch)); } } } catch { n = null; }
  return <div className="calc-panel"><div className="calc-row wrap">{[[2, "ثنائي"], [8, "ثماني"], [10, "عشري"], [16, "سداسي عشر"]].map(([b, l]) => <button type="button" key={b} className={base === b ? "on" : ""} onClick={() => setBase(Number(b))}>{l}</button>)}</div>
    <input className="input" dir="ltr" value={val} onChange={e => setVal(e.target.value)}/>
    <Out lines={n === null ? [] : [`BIN: ${n.toString(2)}`, `OCT: ${n.toString(8)}`, `DEC: ${n.toString(10)}`, `HEX: ${n.toString(16).toUpperCase()}`]} error={val.trim() && n === null ? "رقم غير صالح للنظام المختار." : ""}/></div>;
}

function CalculusPanel({ math }: { math: MathApi }) {
  const [f, setF] = useState("x^3 - 2x"); const [x0, setX0] = useState("1"); const [a, setA] = useState("0"); const [b, setB] = useState("2");
  const out: string[] = []; let error = "";
  try {
    const src = normalizeArabicMath(f).replace(/√/g, "sqrt"); if (src && !/[;=\[\]{}'"`\\]/.test(src) && src.length < 120) {
      const d = math.derivative(src, "x"); const code = math.compile(src); const dc = d.compile(); out.push(`f'(x) = ${d.toString()}`);
      const p = Number(normalizeArabicMath(x0)); if (Number.isFinite(p)) out.push(`f(${p}) = ${fmt(code.evaluate({ x: p }))}`, `f'(${p}) = ${fmt(dc.evaluate({ x: p }))}`);
      const lo = Number(normalizeArabicMath(a)), hi = Number(normalizeArabicMath(b));
      if (Number.isFinite(lo) && Number.isFinite(hi)) { const N = 2000, h = (hi - lo) / N; let s = Number(code.evaluate({ x: lo })) + Number(code.evaluate({ x: hi })); for (let i = 1; i < N; i++) s += (i % 2 ? 4 : 2) * Number(code.evaluate({ x: lo + i * h })); const I = s * h / 3; if (Number.isFinite(I)) out.push(`∫[${lo}, ${hi}] f(x) dx ≈ ${fmt(I)}`); }
    }
  } catch { error = "تعذر تحليل الدالة. استخدم x كمتغير."; }
  return <div className="calc-panel"><label className="small">f(x)</label><input className="input" dir="ltr" value={f} onChange={e => setF(e.target.value)}/><div className="calc-grid"><label><span>x₀</span><input className="input" dir="ltr" value={x0} onChange={e => setX0(e.target.value)}/></label><label><span>من</span><input className="input" dir="ltr" value={a} onChange={e => setA(e.target.value)}/></label><label><span>إلى</span><input className="input" dir="ltr" value={b} onChange={e => setB(e.target.value)}/></label></div><Out lines={out} error={error}/></div>;
}
