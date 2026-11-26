"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calculator, X, History, Delete, Trash2 } from "lucide-react";
import CalcAi from "./CalcAi";
import { normalizeArabicMath } from "@/lib/arabic-math";
import { evalExpr, formatValue, toDMS, type Disp, type Vars } from "@/lib/calc-engine";
import { SolvePanel, ComplexPanel, VectorPanel, DistPanel, TablePanel } from "./CalcPanels";
import { solveCubic, solveLinearText, solveQuadratic, solveSystem2, solveSystem3, toAr, type Solution } from "@/lib/solver-steps";

type Mode = "DEG" | "RAD" | "GRAD";
type Tab = "sci" | "solve" | "graph" | "eq" | "mat" | "vec" | "cx" | "stat" | "dist" | "table" | "conv" | "base" | "calc";
type MathApi = typeof import("mathjs");

const TABS: { id: Tab; label: string }[] = [
  { id: "sci", label: "علمية" }, { id: "solve", label: "SOLVE / CALC" }, { id: "eq", label: "معادلات" }, { id: "cx", label: "أعداد مركبة" }, { id: "mat", label: "مصفوفات" }, { id: "vec", label: "متجهات" }, { id: "dist", label: "توزيعات" }, { id: "table", label: "جدول" }, { id: "graph", label: "رسم" },
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
  const [engine, setEngine] = useState<"casio" | "tools">("casio");
  const [math, setMath] = useState<MathApi | null>(null);
  const [expr, setExpr] = useState("");
  const [mode, setMode] = useState<Mode>("DEG");
  const [shift, setShift] = useState(false);
  const [alpha, setAlpha] = useState(false);
  const [sto, setSto] = useState(false);
  const [hyp, setHyp] = useState(false);
  const [frac, setFrac] = useState(false);
  const [disp, setDisp] = useState<Disp>({ kind: "NORM", n: 9 });
  const [dms, setDms] = useState(false);
  const [showConst, setShowConst] = useState(false);
  const [history, setHistory] = useState<{ e: string; r: string }[]>([]);
  const [showHist, setShowHist] = useState(false);
  const [ans, setAns] = useState("0");
  const [vars, setVars] = useState<Vars>({});
  const [err, setErr] = useState("");
  const [arabicDigits, setArabicDigits] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const caret = useRef<number | null>(null);

  useEffect(() => { try { setHistory(JSON.parse(localStorage.getItem("calc-history") || "[]")); setVars(JSON.parse(localStorage.getItem("calc-vars") || "{}")); } catch {} }, []);
  useEffect(() => { if (open && !math) import("mathjs").then(m => setMath(m)); }, [open, math]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);

  const ansNum = Number(ans) || 0;
  const runWith = useCallback((text: string, extra: Vars = {}) => {
    if (!math) throw new Error("جارٍ تحميل المحرك...");
    return evalExpr(math, text, mode, vars, ansNum, normalizeArabicMath, extra);
  }, [math, mode, vars, ansNum]);
  const fmtV = useCallback((v: unknown) => math ? formatValue(math, v, disp, frac) : String(v), [math, disp, frac]);
  const full = (v: unknown): string => {
    if (typeof v === "number") return String(Number(v.toPrecision(15)));
    if (v && typeof v === "object" && "vals" in (v as object)) return String(((v as { vals: number[] }).vals)[0]);
    return String(v);
  };
  const result = useMemo(() => {
    if (!expr.trim() || !math) return { text: "", raw: undefined as unknown };
    try { const r = runWith(expr); if (typeof r === "function" || r === undefined) return { text: "", raw: undefined }; return { text: dms && typeof r === "number" ? toDMS(r) : fmtV(r), raw: r }; } catch { return { text: "", raw: undefined }; }
  }, [expr, runWith, math, fmtV, dms]);
  const show = (v: string) => (arabicDigits ? v.replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]) : v);

  function equals() {
    setErr("");
    try {
      const r = runWith(expr); const out = full(r);
      if (out === "undefined" || out === "NaN") throw new Error("النتيجة غير معرّفة (Math ERROR).");
      const shown = fmtV(r);
      const next = [{ e: expr, r: shown }, ...history].slice(0, 40);
      setHistory(next); localStorage.setItem("calc-history", JSON.stringify(next)); setAns(out); setExpr(out); caret.current = out.length;
    } catch (e) { setErr(e instanceof Error ? e.message.slice(0, 120) : "Syntax ERROR"); }
  }
  const put = (str: string) => { setErr(""); const el = inputRef.current; const a = caret.current ?? expr.length; const b = el && el.selectionStart !== el.selectionEnd && document.activeElement === el ? (el.selectionEnd ?? a) : a; const st = el && document.activeElement === el ? (el.selectionStart ?? a) : a; const n = expr.slice(0, st) + str + expr.slice(b); setExpr(n); caret.current = st + str.length; setTimeout(() => { el?.setSelectionRange(st + str.length, st + str.length); }, 0); };
  const moveCaret = (d: number) => { const el = inputRef.current; const c = Math.max(0, Math.min(expr.length, (caret.current ?? expr.length) + d)); caret.current = c; if (el) { el.focus(); el.setSelectionRange(c, c); } };
  const backspace = () => { const c = caret.current ?? expr.length; if (c <= 0) return; setExpr(expr.slice(0, c - 1) + expr.slice(c)); caret.current = c - 1; setTimeout(() => inputRef.current?.setSelectionRange(c - 1, c - 1), 0); };
  const storeVar = (name: string) => { const next = { ...vars, [name]: ansNum }; setVars(next); localStorage.setItem("calc-vars", JSON.stringify(next)); setSto(false); };
  const memAdd = (sign: number) => { const v = Number(result.raw !== undefined ? full(result.raw) : ans) || 0; const next = { ...vars, M: (vars.M || 0) + sign * v }; setVars(next); localStorage.setItem("calc-vars", JSON.stringify(next)); };

  const h = hyp ? "h" : "";
  type K = { m: string; s?: string; l: string; sl?: string; c?: string };
  const rows: K[][] = [
    [{ m: "SHIFT", l: "SHIFT", c: "mod" }, { m: "ALPHA", l: "ALPHA", c: "mod" }, { m: "L", l: "◀", c: "nav" }, { m: "R", l: "▶", c: "nav" }, { m: "MODE", l: "MODE", c: "mod" }, { m: "AC", l: "AC", c: "ac" }],
    [{ m: "tabcalc", l: "CALC", s: "tabsolve", sl: "SOLVE" }, { m: "integ(", l: "∫dx", s: "diff(", sl: "d/dx" }, { m: "^(-1)", l: "x⁻¹", s: "!", sl: "x!" }, { m: "logb(", l: "logₐb", s: "sigma(", sl: "Σ" }, { m: "sqrt(", l: "√", s: "cbrt(", sl: "∛" }, { m: "^2", l: "x²", s: "^3", sl: "x³" }],
    [{ m: "^", l: "xʸ", s: "nthRoot(", sl: "ʸ√x" }, { m: "log10(", l: "log", s: "10^(", sl: "10ˣ" }, { m: "ln(", l: "ln", s: "e^(", sl: "eˣ" }, { m: "-", l: "(−)", s: "prod(", sl: "Π" }, { m: "°", l: "° ′ ″", s: "dms", sl: "→DMS" }, { m: "HYP", l: "hyp" }],
    [{ m: `sin${h}(`, l: "sin" + h, s: `asin${h}(`, sl: "sin⁻¹" }, { m: `cos${h}(`, l: "cos" + h, s: `acos${h}(`, sl: "cos⁻¹" }, { m: `tan${h}(`, l: "tan" + h, s: `atan${h}(`, sl: "tan⁻¹" }, { m: "(", l: "(", s: "gcd(", sl: "GCD" }, { m: ")", l: ")", s: "lcm(", sl: "LCM" }, { m: "SD", l: "S⇔D", s: "disp", sl: "FIX/SCI" }],
    [{ m: "7", l: "7", c: "n", s: "CONST", sl: "CONST" }, { m: "8", l: "8", c: "n", s: "tabconv", sl: "CONV" }, { m: "9", l: "9", c: "n", s: "tabmat", sl: "MATRIX" }, { m: "DEL", l: "⌫", c: "del" }, { m: "STO", l: "STO", s: "RCL", sl: "RCL" }, { m: ",", l: ",", s: "rand()", sl: "Ran#" }],
    [{ m: "4", l: "4", c: "n", s: "tabvec", sl: "VECTOR" }, { m: "5", l: "5", c: "n", s: "tabstat", sl: "STAT" }, { m: "6", l: "6", c: "n", s: "tabdist", sl: "DISTR" }, { m: "*", l: "×", c: "op", s: "nPr(", sl: "nPr" }, { m: "/", l: "÷", c: "op", s: "nCr(", sl: "nCr" }, { m: "M+", l: "M+", s: "M-", sl: "M−" }],
    [{ m: "1", l: "1", c: "n", s: "tabcx", sl: "CMPLX" }, { m: "2", l: "2", c: "n", s: "tabeq", sl: "EQN" }, { m: "3", l: "3", c: "n", s: "tabtable", sl: "TABLE" }, { m: "+", l: "+", c: "op", s: "pol(", sl: "Pol" }, { m: "-", l: "−", c: "op", s: "rec(", sl: "Rec" }, { m: "randint(", l: "RanInt", s: "tabbase", sl: "BASE-N" }],
    [{ m: "0", l: "0", c: "n", s: "tabgraph", sl: "GRAPH" }, { m: ".", l: ".", c: "n" }, { m: "e", l: "×10ˣ", s: "pi", sl: "π" }, { m: "Ans", l: "Ans", s: "(e)", sl: "e" }, { m: "i", l: "i", s: "abs(", sl: "Abs" }, { m: "=", l: "=", c: "eq" }],
  ];
  const TABMAP: Record<string, Tab> = { tabcalc: "solve", tabsolve: "solve", tabconv: "conv", tabmat: "mat", tabvec: "vec", tabstat: "stat", tabdist: "dist", tabcx: "cx", tabeq: "eq", tabtable: "table", tabbase: "base", tabgraph: "graph" };
  const press = (k: K) => {
    let code = k.m;
    if (shift && k.s) code = k.s;
    if (k.m !== "SHIFT" && k.m !== "ALPHA" || k.m === "SHIFT") { /* keep */ }
    if (k.m !== "SHIFT") setShift(false);
    if (code === "SHIFT") { setShift(s => !s); return; }
    if (code === "ALPHA") { setAlpha(a => !a); return; }
    if (code === "AC") { setExpr(""); setErr(""); caret.current = 0; return; }
    if (code === "DEL") { backspace(); return; }
    if (code === "=") { equals(); return; }
    if (code === "HYP") { setHyp(!hyp); return; }
    if (code === "SD") { setFrac(!frac); return; }
    if (code === "L") { moveCaret(-1); return; }
    if (code === "R") { moveCaret(1); return; }
    if (code === "MODE") { setMode(mode === "DEG" ? "RAD" : mode === "RAD" ? "GRAD" : "DEG"); return; }
    if (code === "STO") { setSto(true); setAlpha(true); return; }
    if (code === "RCL") { setAlpha(true); return; }
    if (code === "M+") { memAdd(1); return; }
    if (code === "M-") { memAdd(-1); return; }
    if (code === "dms") { setDms(d => !d); return; }
    if (code === "disp") { setDisp(d => d.kind === "NORM" ? { kind: "FIX", n: 3 } : d.kind === "FIX" ? { kind: "SCI", n: 4 } : d.kind === "SCI" ? { kind: "ENG", n: 4 } : { kind: "NORM", n: 9 }); return; }
    if (code === "CONST") { setShowConst(c => !c); return; }
    if (TABMAP[code]) { setTab(TABMAP[code]); return; }
    put(code);
  };
  const letters = ["A", "B", "C", "D", "E", "F", "X", "Y", "M"];
  const pickLetter = (l: string) => { if (sto) storeVar(l); else put(l); setAlpha(false); };
  const quick = ["i", "abs(", "conj(", "re(", "im(", "arg(", "%", "pi", "!"];
  const cur = (n: string) => n;

  return <>
    <button type="button" className="calc-fab" aria-label="فتح الآلة الحاسبة" title="الآلة الحاسبة" onClick={() => setOpen(o => !o)}><Calculator size={26}/><span className="calc-fab-ring" aria-hidden="true"/></button>
    {open && <div className="calc-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="calc-modal glass" role="dialog" aria-modal="true" aria-label="الآلة الحاسبة المتطورة" ref={dialogRef} dir="rtl">
        <div className="calc-head"><strong><Calculator size={18}/> الآلة الحاسبة المتطورة</strong><span className="calc-solar" aria-hidden="true"/><em className="calc-model" dir="ltr">SANAFIRY · fx-ADVANCED</em><button className="icon-button" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={18}/></button></div>
        <div className="calc-tabs" role="tablist" style={{ marginBottom: 6 }}>
          <button type="button" role="tab" aria-selected={engine === "casio"} className={engine === "casio" ? "active" : ""} onClick={() => setEngine("casio")}>كاسيو الكاملة</button>
          <button type="button" role="tab" aria-selected={engine === "tools"} className={engine === "tools" ? "active" : ""} onClick={() => setEngine("tools")}>أدوات إضافية (رسم، وحدات...)</button>
        </div>
        <CalcAi seed={engine === "tools" ? expr : ""}/>
        {engine === "casio" && <iframe title="آلة كاسيو" src="/calc/index.html" style={{ width: "100%", height: "min(78vh, 760px)", border: 0, borderRadius: 16, background: "#0b1016" }} allow="clipboard-write"/>}
        {engine === "tools" && <div className="calc-tabs" role="tablist">{TABS.map(t => <button type="button" role="tab" aria-selected={tab === t.id} key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>}
        {engine === "tools" && !math && <div className="calc-loading">جارٍ تحميل محرك الحساب...</div>}
        {engine === "tools" && math && tab === "sci" && <>
          <div className="calc-display" dir="ltr">
            <div className="calc-status">{shift ? <b>S</b> : null}{alpha ? <b>A</b> : null}{sto ? <b>STO</b> : null}<span>{mode}</span><span>{disp.kind === "NORM" ? "NORM" : disp.kind + disp.n}</span>{frac && <span>FRAC</span>}{dms && <span>DMS</span>}{hyp && <span>HYP</span>}</div>
            <input ref={inputRef} className="calc-input" inputMode="none" onSelect={e => { caret.current = e.currentTarget.selectionStart; }} value={expr} onChange={e => { setExpr(e.target.value); setErr(""); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); equals(); } }} aria-label="التعبير" placeholder="0" dir="ltr" autoComplete="off" spellCheck={false}/>
            <div className={`calc-result ${err ? "err" : ""}`}>{err || (result.text ? show(result.text) : "\u00a0")}</div>
          </div>
          <div className="calc-toolbar">
            <button type="button" onClick={() => setMode(mode === "DEG" ? "RAD" : mode === "RAD" ? "GRAD" : "DEG")}>{mode}</button>
            <button type="button" className={frac ? "on" : ""} onClick={() => setFrac(!frac)}>S⇔D</button>
            <button type="button" className={dms ? "on" : ""} onClick={() => setDms(!dms)}>→DMS</button>
            <button type="button" onClick={() => setDisp(d => d.kind === "NORM" ? { kind: "FIX", n: 3 } : d.kind === "FIX" ? { kind: "SCI", n: 4 } : d.kind === "SCI" ? { kind: "ENG", n: 4 } : { kind: "NORM", n: 9 })}>{disp.kind === "NORM" ? "NORM" : disp.kind}</button>
            {disp.kind !== "NORM" && <button type="button" onClick={() => setDisp({ ...disp, n: disp.n >= 9 ? 0 : disp.n + 1 })}>{disp.n} رقم</button>}
            <button type="button" className={arabicDigits ? "on" : ""} onClick={() => setArabicDigits(!arabicDigits)}>١٢٣</button>
            <button type="button" className={showConst ? "on" : ""} onClick={() => setShowConst(!showConst)}>ثوابت</button>
            <button type="button" className={showHist ? "on" : ""} onClick={() => setShowHist(!showHist)} aria-label="السجل"><History size={14}/></button>
          </div>
          <div className="calc-toolbar calc-quick" dir="ltr">{quick.map(q => <button type="button" key={q} onClick={() => put(q)}>{q === "pi" ? "π" : q}</button>)}</div>
          {(alpha || sto) && <div className="calc-toolbar calc-quick" dir="ltr">{letters.map(l => <button type="button" key={l} className="on" onClick={() => pickLetter(l)}>{sto ? "→" : ""}{l}{vars[l] !== undefined ? `=${cur(String(Number(vars[l].toPrecision(6))))}` : ""}</button>)}</div>}
          {showConst && <div className="calc-consts" dir="rtl">{CONSTS.map(([n, v, sym]) => <button type="button" key={n} onClick={() => { put(v); setShowConst(false); }}><span>{n}</span><small dir="ltr">{sym}</small></button>)}</div>}
          {showHist ? <div className="calc-history">{history.length ? <>{history.map((x, i) => <button type="button" key={i} onClick={() => { setExpr(x.r); setShowHist(false); }}><span dir="ltr">{x.e}</span><b dir="ltr">= {show(x.r)}</b></button>)}<button type="button" className="calc-clear" onClick={() => { setHistory([]); localStorage.removeItem("calc-history"); }}><Trash2 size={14}/> مسح السجل</button></> : <p className="muted">لا توجد عمليات بعد.</p>}</div>
            : <div className="calc-keys casio">{rows.flat().map((k, i) => <button type="button" key={i} className={`k-${k.c || "fn"} ${shift && k.s ? "shifted" : ""}`} onClick={() => press(k)}>{k.sl && <i className="k-sh">{k.sl}</i>}<span>{k.m === "DEL" ? <Delete size={18}/> : k.l}</span></button>)}</div>}
        </>}
        {engine === "tools" && math && tab === "solve" && <SolvePanel math={math} runWith={runWith} initial={expr} fmtV={fmtV}/>}
        {engine === "tools" && math && tab === "cx" && <ComplexPanel math={math} mode={mode} fmtV={fmtV}/>}
        {engine === "tools" && math && tab === "vec" && <VectorPanel math={math} mode={mode} fmtV={fmtV}/>}
        {engine === "tools" && math && tab === "dist" && <DistPanel math={math}/>}
        {engine === "tools" && math && tab === "table" && <TablePanel runWith={runWith} fmtV={fmtV}/>}
        {engine === "tools" && math && tab === "graph" && <MiniGraph math={math} mode={mode}/>}
        {engine === "tools" && math && tab === "eq" && <EquationPanel math={math}/>}
        {engine === "tools" && math && tab === "mat" && <MatrixPanel math={math}/>}
        {engine === "tools" && math && tab === "stat" && <StatPanel math={math}/>}
        {engine === "tools" && math && tab === "conv" && <ConvertPanel/>}
        {engine === "tools" && math && tab === "base" && <BasePanel/>}
        {engine === "tools" && math && tab === "calc" && <CalculusPanel math={math}/>}
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
