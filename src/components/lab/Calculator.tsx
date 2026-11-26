"use client";

import { useMemo, useState } from "react";
import { errorMessage, evaluate } from "@/lib/mathEval";

const KEY_ROWS = [
  ["sin(", "cos(", "tan(", "asin(", "acos(", "atan("],
  ["sinh(", "cosh(", "tanh(", "sqrt(", "abs(", "exp("],
  ["7", "8", "9", "÷", "×", "−"],
  ["4", "5", "6", "(", ")", "+"],
  ["1", "2", "3", "^", "%", "π"],
  ["0", ".", "e", "log(", "ln(", "x"],
  ["min(", "max(", "floor(", "ceil(", "round(", "pow("],
  ["fact(", "ncr(", "npr(", "gcd(", "lcm(", "cbrt("],
  ["log2(", "log10(", "sec(", "csc(", "cot(", "sinh("],
];

const NORMALIZE: Record<string, string> = { "÷": "/", "×": "*", "−": "-", "π": "pi" };

export default function Calculator() {
  const [expr, setExpr] = useState("sqrt(3^2 + 4^2)");
  const [degrees, setDegrees] = useState(true);
  const [xValue, setXValue] = useState("0");
  const [result, setResult] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const [memory, setMemory] = useState("0");

  const preview = useMemo(() => {
    if (!expr.trim()) return null;
    const issue = errorMessage(expr);
    if (issue) return null;
    try {
      const value = evaluate(expr, { x: Number(xValue), degrees });
      return Number.isFinite(value) ? Number(value.toPrecision(11)).toString() : null;
    } catch {
      return null;
    }
  }, [expr, degrees, xValue]);

  const insert = (key: string) => {
    const value = NORMALIZE[key] ?? key;
    setExpr((prev) => prev + (value === "Ans" ? lastAnswer : value));
    setError(null);
  };

  const compute = () => {
    const issue = errorMessage(expr);
    if (issue) {
      setError(issue);
      setResult(null);
      return;
    }
    try {
      const value = evaluate(expr, { x: Number(xValue), degrees });
      const formatted = Number.isFinite(value) ? Number(value.toPrecision(12)).toString() : "غير معرّف";
      setResult(formatted);
      setError(null);
      if (Number.isFinite(value)) setLastAnswer(String(value));
      setHistory((prev) => [{ expr, result: formatted }, ...prev].slice(0, 12));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر الحساب");
      setResult(null);
    }
  };

  const memoryRecall = () => setExpr((prev) => prev + memory);
  const memoryStore = () => {
    const value = preview ?? result;
    if (value && Number.isFinite(Number(value))) setMemory(value);
  };

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div>
          <span className="plate-label">ADVANCED SCIENTIFIC ENGINE</span>
          <h3 className="mt-1 text-lg font-bold text-ink">آلة حاسبة علمية متقدمة</h3>
          <p className="mt-1 text-xs text-ink-faint">الدوال المثلثية والعكسية · اللوغاريتمات · الأسس · الذاكرة</p>
        </div>
        <button
          type="button"
          onClick={() => setDegrees((v) => !v)}
          className="chip cursor-pointer transition hover:border-accent hover:text-accent"
        >
          {degrees ? "DEG · درجات" : "RAD · راديان"}
        </button>
      </div>

      <div className="grid gap-3 p-3 sm:gap-4 sm:p-5">
        <div className="rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface-2)_78%,transparent)] p-4">
          <label htmlFor="scientific-expression" className="plate-label">MATHEMATICAL EXPRESSION</label>
          <input
            id="scientific-expression"
            value={expr}
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => { setExpr(event.target.value); setError(null); }}
            onKeyDown={(event) => { if (event.key === "Enter") compute(); }}
            className="mt-2 w-full border-0 bg-transparent text-left font-mono text-xl text-ink outline-none placeholder:text-ink-faint sm:text-2xl"
            placeholder="اكتب التعبير الرياضي..."
            aria-label="التعبير الرياضي"
          />
          <div className="mt-3 flex min-h-7 items-center justify-between gap-3 border-t border-line pt-2">
            <span className="text-xs text-ink-faint">معاينة</span>
            <span dir="ltr" className="tnum text-sm text-accent">{preview ?? "—"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
          <label htmlFor="calculator-x" className="text-xs text-ink-soft">قيمة المتغير x</label>
          <input
            id="calculator-x"
            value={xValue}
            onChange={(event) => setXValue(event.target.value)}
            dir="ltr"
            inputMode="decimal"
            className="w-28 rounded-lg border border-line bg-transparent px-3 py-1.5 text-left font-mono text-sm text-ink outline-none focus:border-accent"
          />
        </div>

        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {KEY_ROWS.flat().map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => insert(key)}
              className="min-h-10 rounded-xl border border-line bg-[color-mix(in_srgb,var(--surface-3)_52%,transparent)] px-1 py-2 font-mono text-[0.76rem] text-ink transition hover:-translate-y-0.5 hover:border-accent hover:bg-[rgba(79,227,232,0.1)] hover:text-accent sm:min-h-12 sm:text-sm"
            >
              {key}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button type="button" onClick={() => insert("Ans")} className="btn btn-ghost py-3">Ans</button>
          <button type="button" onClick={() => setExpr((prev) => prev.slice(0, -1))} className="btn btn-ghost py-3">⌫ حذف</button>
          <button type="button" onClick={memoryStore} className="btn btn-ghost py-3">MS</button>
          <button type="button" onClick={memoryRecall} className="btn btn-ghost py-3">MR</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={compute} className="btn btn-primary min-h-12 flex-1 py-3">احسب النتيجة</button>
          <button type="button" onClick={() => { setExpr(""); setResult(null); setError(null); }} className="btn btn-ghost px-5 py-3">مسح الكل</button>
        </div>

        <div className="rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="plate-label">RESULT</span>
            <span className="text-xs text-ink-faint">M = <span dir="ltr" className="tnum text-accent">{memory}</span></span>
          </div>
          {error ? (
            <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
          ) : (
            <p dir="ltr" className="tnum mt-3 min-h-9 break-all text-left text-2xl font-semibold text-accent sm:text-3xl">
              {result ?? "—"}
            </p>
          )}
        </div>

        {history.length > 0 ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="plate-label">RECENT CALCULATIONS</span>
              <button type="button" onClick={() => setHistory([])} className="text-xs text-ink-faint transition hover:text-accent">مسح السجل</button>
            </div>
            <ul className="mt-2 grid max-h-36 gap-2 overflow-y-auto">
              {history.map((item, index) => (
                <li key={`${item.expr}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-xs sm:text-sm">
                  <button type="button" dir="ltr" onClick={() => setExpr(item.expr)} className="min-w-0 truncate text-left font-mono text-ink-soft hover:text-accent">{item.expr}</button>
                  <span dir="ltr" className="tnum shrink-0 text-accent">{item.result}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
