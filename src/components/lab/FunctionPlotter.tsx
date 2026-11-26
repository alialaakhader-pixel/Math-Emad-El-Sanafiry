"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, evaluate } from "@/lib/mathEval";

type Range = { xMin: number; xMax: number; yMin: number; yMax: number };

const DEFAULT_EXPRS = ["sin(x)", "0.15*x^2 - 3"];

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export default function FunctionPlotter() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [exprs, setExprs] = useState<string[]>(DEFAULT_EXPRS);
  const [range, setRange] = useState<Range>({ xMin: -10, xMax: 10, yMin: -6, yMax: 6 });
  const [showGrid, setShowGrid] = useState(true);
  const [readout, setReadout] = useState<string>("مرّر المؤشر فوق الرسم لقراءة القيم");
  const dragRef = useRef<{ x: number; y: number; range: Range } | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ink = cssVar("--ink", "#eaf0ff");
    const faint = cssVar("--ink-faint", "#6d7aa3");
    const surface = cssVar("--surface", "#070b1c");
    const accent = cssVar("--accent", "#4fe3e8");

    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, w, h);

    const { xMin, xMax, yMin, yMax } = range;
    const toX = (x: number) => ((x - xMin) / (xMax - xMin)) * w;
    const toY = (y: number) => h - ((y - yMin) / (yMax - yMin)) * h;

    if (showGrid) {
      ctx.strokeStyle = faint;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1;
      const stepX = niceStep(xMax - xMin);
      const stepY = niceStep(yMax - yMin);
      for (let x = Math.ceil(xMin / stepX) * stepX; x <= xMax; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(toX(x), 0);
        ctx.lineTo(toX(x), h);
        ctx.stroke();
      }
      for (let y = Math.ceil(yMin / stepY) * stepY; y <= yMax; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(0, toY(y));
        ctx.lineTo(w, toY(y));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // axes
    ctx.strokeStyle = ink;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, toY(0));
    ctx.lineTo(w, toY(0));
    ctx.moveTo(toX(0), 0);
    ctx.lineTo(toX(0), h);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // tick labels
    ctx.fillStyle = faint;
    ctx.font = "11px 'IBM Plex Mono', monospace";
    const stepX = niceStep(xMax - xMin);
    for (let x = Math.ceil(xMin / stepX) * stepX; x <= xMax; x += stepX) {
      if (Math.abs(x) < 1e-9) continue;
      ctx.fillText(formatNumber(x), toX(x) + 4, Math.min(h - 6, toY(0) + 16));
    }
    const stepY = niceStep(yMax - yMin);
    for (let y = Math.ceil(yMin / stepY) * stepY; y <= yMax; y += stepY) {
      if (Math.abs(y) < 1e-9) continue;
      ctx.fillText(formatNumber(y), toX(0) + 6, toY(y) - 4);
    }

    const colors = [accent, cssVar("--brand-2", "#8b6bff"), cssVar("--blue", "#2e7cf6"), cssVar("--danger", "#ff6b81")];
    const roots: number[][] = [];

    exprs.forEach((expr, index) => {
      const err = errorMessage(expr);
      if (err || !expr.trim()) {
        roots.push([]);
        return;
      }
      const color = colors[index % colors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      let drawing = false;
      const rootsForExpr: number[] = [];
      let prev: number | null = null;

      for (let px = 0; px <= w; px += 1) {
        const x = xMin + (px / w) * (xMax - xMin);
        let y: number;
        try {
          y = evaluate(expr, { x, degrees: false });
        } catch {
          y = NaN;
        }
        if (!Number.isFinite(y) || Math.abs(y) > 1e7) {
          drawing = false;
          prev = null;
          continue;
        }
        const py = toY(y);
        if (prev !== null && Math.sign(prev) !== Math.sign(y) && Math.abs(y - prev) < (yMax - yMin) * 2) {
          rootsForExpr.push(x);
        }
        prev = y;
        if (!drawing) {
          ctx.moveTo(px, py);
          drawing = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      roots.push(rootsForExpr);
    });

    // root markers for the first function
    const primary = roots[0] ?? [];
    if (primary.length > 0 && exprs[0].trim()) {
      ctx.fillStyle = accent;
      for (const root of primary.slice(0, 12)) {
        ctx.beginPath();
        ctx.arc(toX(root), toY(0), 4, 0, Math.PI * 2);
        ctx.fill();
      }
      setReadout(`نقاط تقطير المحور السيني: ${primary.slice(0, 6).map(formatNumber).join("، ")}`);
    }
  }, [exprs, range, showGrid]);

  useEffect(() => {
    draw();
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(host);
    return () => ro.disconnect();
  }, [draw]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    (event.target as HTMLCanvasElement).setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, range };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { xMin, xMax, yMin, yMax } = dragRef.current?.range ?? range;
    const x = xMin + ((event.clientX - rect.left) / rect.width) * (xMax - xMin);
    const y = yMax - ((event.clientY - rect.top) / rect.height) * (yMax - yMin);

    if (dragRef.current) {
      const dx = ((event.clientX - dragRef.current.x) / rect.width) * (dragRef.current.range.xMax - dragRef.current.range.xMin);
      const dy = ((event.clientY - dragRef.current.y) / rect.height) * (dragRef.current.range.yMax - dragRef.current.range.yMin);
      setRange({
        xMin: dragRef.current.range.xMin - dx,
        xMax: dragRef.current.range.xMax - dx,
        yMin: dragRef.current.range.yMin + dy,
        yMax: dragRef.current.range.yMax + dy,
      });
      return;
    }

    const values = exprs
      .map((expr) => {
        if (!expr.trim() || errorMessage(expr)) return null;
        try {
          return `${expr} = ${formatNumber(evaluate(expr, { x, degrees: false }))}`;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    setReadout(`x = ${formatNumber(x)}   ${values.join("   |   ")}`);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const zoom = (factor: number) => {
    setRange((prev) => {
      const cx = (prev.xMin + prev.xMax) / 2;
      const cy = (prev.yMin + prev.yMax) / 2;
      const hx = ((prev.xMax - prev.xMin) / 2) * factor;
      const hy = ((prev.yMax - prev.yMin) / 2) * factor;
      return { xMin: cx - hx, xMax: cx + hx, yMin: cy - hy, yMax: cy + hy };
    });
  };

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <span className="plate-label">FUNCTION PLOTTER</span>
          <h3 className="mt-2 text-lg font-bold text-ink">رسم الدوال</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => zoom(0.8)} className="btn btn-ghost px-4 py-2 text-sm">
            تكبير
          </button>
          <button type="button" onClick={() => zoom(1.25)} className="btn btn-ghost px-4 py-2 text-sm">
            تصغير
          </button>
          <button
            type="button"
            onClick={() => setRange({ xMin: -10, xMax: 10, yMin: -6, yMax: 6 })}
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            إعادة الضبط
          </button>
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className={`btn px-4 py-2 text-sm ${showGrid ? "btn-primary" : "btn-ghost"}`}
          >
            الشبكة
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        {exprs.map((expr, index) => (
          <div key={index} className="flex flex-wrap items-center gap-3">
            <span className="tnum text-sm text-accent">y{index + 1} =</span>
            <input
              value={expr}
              dir="ltr"
              onChange={(event) => {
                const next = [...exprs];
                next[index] = event.target.value;
                setExprs(next);
              }}
              className="field flex-1 text-left"
              placeholder="مثال: sin(x) / x"
              aria-label={`الدالة رقم ${index + 1}`}
            />
            {exprs.length > 1 ? (
              <button
                type="button"
                onClick={() => setExprs(exprs.filter((_, i) => i !== index))}
                className="btn btn-ghost px-3 py-2 text-sm text-[var(--danger)]"
              >
                حذف
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setExprs([...exprs, ""])}
          className="btn btn-ghost justify-self-start px-5 py-2 text-sm"
        >
          + إضافة دالة
        </button>

        <div ref={hostRef} className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-line">
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>

        <p className="tnum rounded-xl border border-line px-4 py-3 text-[0.82rem] text-ink-soft">{readout}</p>
        <p className="text-[0.78rem] leading-[1.9] text-ink-faint">
          اسحب الرسم للتحريك، واستخدم أزرار التكبير للتحكم في المجال. الدوال المدعومة: sin, cos, tan,
          asin, acos, atan, log, ln, sqrt, abs, exp, min, max, pow والثوابت pi, e, tau.
        </p>
      </div>
    </div>
  );
}

function niceStep(span: number): number {
  const raw = span / 10;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
  const norm = raw / mag;
  const step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return step * mag;
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000 || (Math.abs(value) < 0.01 && value !== 0)) return value.toExponential(1);
  return Number(value.toFixed(2)).toString();
}
