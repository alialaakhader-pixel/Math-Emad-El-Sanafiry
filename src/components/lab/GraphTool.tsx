"use client";
import { useEffect, useMemo, useRef } from "react";
import { Minus, Move, Plus, RotateCcw } from "lucide-react";
import { compile } from "mathjs";
export type GraphRange = { min: number; max: number; centerY: number };
const allowedNames = new Set(["x", "sin", "cos", "tan", "asin", "acos", "atan", "sqrt", "abs", "log", "exp", "pi", "e", "floor", "ceil", "round"]);
function evaluator(expression: string) {
  const cleaned = expression.trim().replace(/^y\s*=/i, "");
  if (!cleaned || cleaned.length > 100 || !/^[\da-zA-Z\s+\-*/^().,]+$/.test(cleaned)) throw new Error("اكتب دالة مثل sin(x) أو x^2 - 4.");
  if ([...cleaned.matchAll(/[a-zA-Z]+/g)].some(match => !allowedNames.has(match[0].toLowerCase()))) throw new Error("استخدم x والعمليات والدوال الرياضية المعروفة فقط.");
  const compiled = compile(cleaned);
  return (x: number) => { try { const n = Number(compiled.evaluate({ x })); return Number.isFinite(n) ? n : NaN; } catch { return NaN; } };
}
export default function GraphTool({ expression, setExpression, range, setRange }: { expression: string; setExpression: (value: string) => void; range: GraphRange; setRange: (value: GraphRange) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<{ x: number; y: number; range: GraphRange } | null>(null);
  const calculation = useMemo(() => {
    try {
      const fn = evaluator(expression);
      const roots: number[] = [];
      let previousX = range.min, previousY = fn(previousX);
      for (let i = 1; i <= 500; i++) {
        const x = range.min + (range.max - range.min) * i / 500, y = fn(x);
        if (Number.isFinite(y) && Number.isFinite(previousY) && Math.abs(y - previousY) < Math.max(5, range.max - range.min) && ((y === 0) || (previousY * y < 0))) {
          let left = previousX, right = x;
          for (let j = 0; j < 15; j++) { const mid = (left + right) / 2; if (fn(left) * fn(mid) <= 0) right = mid; else left = mid; }
          const root = (left + right) / 2;
          if (!roots.some(r => Math.abs(r - root) < (range.max - range.min) / 70)) roots.push(root);
        }
        previousX = x; previousY = y;
      }
      return { fn, roots: roots.slice(0, 12), yIntercept: range.min <= 0 && range.max >= 0 ? fn(0) : NaN, error: "" };
    } catch (e) { return { fn: (_: number) => NaN, roots: [], yIntercept: NaN, error: e instanceof Error ? e.message : "الدالة غير صالحة." }; }
  }, [expression, range.min, range.max]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const paint = () => {
      const rect = element.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2), w = rect.width, h = rect.height;
      element.width = Math.round(w * dpr); element.height = Math.round(h * dpr);
      const ctx = element.getContext("2d"); if (!ctx) return; ctx.scale(dpr, dpr);
      ctx.fillStyle = "#10192f"; ctx.fillRect(0, 0, w, h);
      const scale = w / (range.max - range.min); const xp = (x: number) => (x - range.min) * scale; const yp = (y: number) => h / 2 - (y - range.centerY) * scale;
      const span = range.max - range.min;
      const rawStep = span / 9, power = 10 ** Math.floor(Math.log10(rawStep)), factor = rawStep / power;
      const step = (factor < 1.5 ? 1 : factor < 3.5 ? 2 : factor < 7.5 ? 5 : 10) * power;
      ctx.lineWidth = 1; ctx.strokeStyle = "rgba(158,177,219,.11)"; ctx.fillStyle = "rgba(162,180,220,.5)"; ctx.font = "10px Arial";
      for (let x = Math.ceil(range.min / step) * step; x <= range.max; x += step) { const px = xp(x); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke(); if (Math.abs(x) > step / 100) ctx.fillText(Number(x.toFixed(2)).toString(), px + 3, Math.max(13, Math.min(h - 7, yp(0) - 5))); }
      const bottom = range.centerY - h / (2 * scale), top = range.centerY + h / (2 * scale);
      for (let y = Math.ceil(bottom / step) * step; y <= top; y += step) { const py = yp(y); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke(); if (Math.abs(y) > step / 100) ctx.fillText(Number(y.toFixed(2)).toString(), Math.max(4, Math.min(w - 35, xp(0) + 5)), py - 4); }
      ctx.strokeStyle = "rgba(201,213,245,.58)"; ctx.lineWidth = 1.5;
      if (xp(0) >= 0 && xp(0) <= w) { ctx.beginPath(); ctx.moveTo(xp(0), 0); ctx.lineTo(xp(0), h); ctx.stroke(); }
      if (yp(0) >= 0 && yp(0) <= h) { ctx.beginPath(); ctx.moveTo(0, yp(0)); ctx.lineTo(w, yp(0)); ctx.stroke(); }
      if (!calculation.error) {
        ctx.beginPath(); let started = false, lastY = 0;
        for (let i = 0; i <= Math.min(1600, Math.ceil(w * 1.6)); i++) {
          const px = i / Math.min(1600, Math.ceil(w * 1.6)) * w; const x = range.min + px / scale; const y = calculation.fn(x), py = yp(y);
          if (!Number.isFinite(py) || Math.abs(py) > 20000 || (started && Math.abs(py - lastY) > h * 1.5)) { started = false; continue; }
          if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
          lastY = py;
        }
        ctx.strokeStyle = "rgba(110,219,244,.24)"; ctx.lineWidth = 9; ctx.stroke();
        ctx.strokeStyle = "#87e4f5"; ctx.lineWidth = 2.7; ctx.stroke();
        const points = [...calculation.roots.map(x => [x, 0]), ...(Number.isFinite(calculation.yIntercept) ? [[0, calculation.yIntercept]] : [])];
        for (const [x, y] of points) { const px = xp(x), py = yp(y); if (py < -10 || py > h + 10) continue; ctx.fillStyle = "#bcaaff"; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#10192f"; ctx.lineWidth = 2; ctx.stroke(); }
      }
    };
    const observer = new ResizeObserver(paint); observer.observe(element); paint();
    return () => observer.disconnect();
  }, [calculation, range]);
  function zoom(factor: number) { const middle = (range.min + range.max) / 2; const half = Math.max(.2, Math.min(100, (range.max - range.min) * factor / 2)); setRange({ ...range, min: middle - half, max: middle + half }); }
  return <><div className="form-field"><label htmlFor="graph-fn">الدالة f(x)</label><input className="input" id="graph-fn" dir="ltr" value={expression} onChange={e => setExpression(e.target.value)} placeholder="sin(x), x^2 - 4, sqrt(abs(x))"/><small className="hint">استخدم x، مثل: sin(x) أو x^2 − 4 أو cos(x) + x/2</small></div><div className="graph-controls"><div className="form-field"><label>بداية المجال (x)</label><input className="input" type="number" step="any" value={range.min} onChange={e => { const min = Number(e.target.value); if (min < range.max - .1) setRange({ ...range, min }); }}/></div><div className="form-field"><label>نهاية المجال (x)</label><input className="input" type="number" step="any" value={range.max} onChange={e => { const max = Number(e.target.value); if (max > range.min + .1) setRange({ ...range, max }); }}/></div></div><div className="tool-toolbar"><button onClick={() => zoom(.75)} type="button" title="تكبير"><Plus size={15}/> تكبير</button><button onClick={() => zoom(1.33)} type="button" title="تصغير"><Minus size={15}/> تصغير</button><button onClick={() => setRange({ min: -10, max: 10, centerY: 0 })} type="button"><RotateCcw size={15}/> إعادة الضبط</button><span className="muted small"><Move size={13} style={{ display: "inline" }}/> اسحب لتحريك الرسم، مرّر للتكبير</span></div>
    <div className="graph-container" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); dragging.current = { x: e.clientX, y: e.clientY, range: { ...range } }; }} onPointerMove={e => { if (!dragging.current) return; const w = e.currentTarget.clientWidth; const span = dragging.current.range.max - dragging.current.range.min; const dx = (e.clientX - dragging.current.x) / w * span, dy = (e.clientY - dragging.current.y) / w * span; setRange({ min: dragging.current.range.min - dx, max: dragging.current.range.max - dx, centerY: dragging.current.range.centerY + dy }); }} onPointerUp={e => { dragging.current = null; e.currentTarget.releasePointerCapture(e.pointerId); }} onWheel={e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.08 : .92); }}><canvas ref={canvas} aria-label={`رسم الدالة ${expression}`}/></div>
    {calculation.error ? <div className="message error">{calculation.error}</div> : <div className="graph-intersections">{calculation.roots.length ? `تقاطع محور x: ${calculation.roots.map(x => `(${Number(x.toFixed(3))}, 0)`).join("، ")}` : "لا توجد نقاط تقاطع مع محور x في المجال المعروض."}{Number.isFinite(calculation.yIntercept) && ` · تقاطع محور y: (0, ${Number(calculation.yIntercept.toFixed(3))})`}</div>}
  </>;
}
