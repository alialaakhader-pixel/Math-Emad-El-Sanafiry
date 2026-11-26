"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Tool = "pen" | "line" | "rect" | "circle" | "arrow" | "eraser";

type Point = { x: number; y: number };

type Op = {
  tool: Tool;
  color: string;
  width: number;
  points: Point[];
  from: Point;
  to: Point;
};

const COLORS = ["#4fe3e8", "#6d4aff", "#eaf0ff", "#ff6b81", "#4fe3a5", "#2e7cf6"];

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(3);
  const opsRef = useRef<Op[]>([]);
  const redoRef = useRef<Op[]>([]);
  const drawingRef = useRef<Op | null>(null);
  const [hasContent, setHasContent] = useState(false);

  const redraw = useCallback(() => {
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
    ctx.clearRect(0, 0, w, h);

    const drawOp = (op: Op) => {
      ctx.lineWidth = op.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = op.color;

      if (op.tool === "pen" || op.tool === "eraser") {
        ctx.globalCompositeOperation = op.tool === "eraser" ? "destination-out" : "source-over";
        ctx.beginPath();
        op.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        return;
      }
      void op.points;

      ctx.beginPath();
      if (op.tool === "line") {
        ctx.moveTo(op.from.x, op.from.y);
        ctx.lineTo(op.to.x, op.to.y);
      } else if (op.tool === "rect") {
        ctx.rect(op.from.x, op.from.y, op.to.x - op.from.x, op.to.y - op.from.y);
      } else if (op.tool === "circle") {
        const rx = Math.abs(op.to.x - op.from.x);
        const ry = Math.abs(op.to.y - op.from.y);
        ctx.ellipse(op.from.x, op.from.y, rx, ry, 0, 0, Math.PI * 2);
      } else if (op.tool === "arrow") {
        const dx = op.to.x - op.from.x;
        const dy = op.to.y - op.from.y;
        const angle = Math.atan2(dy, dx);
        const head = Math.max(10, op.width * 4);
        ctx.moveTo(op.from.x, op.from.y);
        ctx.lineTo(op.to.x, op.to.y);
        ctx.moveTo(op.to.x, op.to.y);
        ctx.lineTo(op.to.x - head * Math.cos(angle - Math.PI / 6), op.to.y - head * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(op.to.x, op.to.y);
        ctx.lineTo(op.to.x - head * Math.cos(angle + Math.PI / 6), op.to.y - head * Math.sin(angle + Math.PI / 6));
      }
      ctx.stroke();
    };

    opsRef.current.forEach(drawOp);
    if (drawingRef.current) drawOp(drawingRef.current);
    setHasContent(opsRef.current.length > 0);
  }, []);

  useEffect(() => {
    redraw();
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(host);
    return () => ro.disconnect();
  }, [redraw]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    redoRef.current = [];
    drawingRef.current = {
      tool,
      color,
      width: tool === "eraser" ? width * 4 : width,
      points: [point],
      from: point,
      to: point,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = drawingRef.current;
    if (!current) return;
    const point = pointFromEvent(event);
    if (current.tool === "pen" || current.tool === "eraser") current.points.push(point);
    else current.to = { x: point.x, y: point.y };
    redraw();
  };

  const onPointerUp = () => {
    const current = drawingRef.current;
    if (current) {
      opsRef.current.push(current);
      drawingRef.current = null;
      redraw();
    }
  };

  const undo = () => {
    const last = opsRef.current.pop();
    if (last) redoRef.current.push(last);
    redraw();
  };

  const redo = () => {
    const last = redoRef.current.pop();
    if (last) opsRef.current.push(last);
    redraw();
  };

  const clear = () => {
    opsRef.current = [];
    redoRef.current = [];
    redraw();
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `سبورة-السنافيري-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <span className="plate-label">INTERACTIVE WHITEBOARD</span>
          <h3 className="mt-2 text-lg font-bold text-ink">السبورة الرياضية</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={undo} className="btn btn-ghost px-4 py-2 text-sm">
            تراجع
          </button>
          <button type="button" onClick={redo} className="btn btn-ghost px-4 py-2 text-sm">
            إعادة
          </button>
          <button type="button" onClick={clear} className="btn btn-ghost px-4 py-2 text-sm text-[var(--danger)]">
            مسح الكل
          </button>
          <button type="button" onClick={save} disabled={!hasContent} className="btn btn-primary px-4 py-2 text-sm">
            حفظ كصورة
          </button>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["pen", "قلم"],
              ["line", "خط"],
              ["rect", "مستطيل"],
              ["circle", "دائرة"],
              ["arrow", "سهم"],
              ["eraser", "ممحاة"],
            ] as [Tool, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTool(value)}
              className={`btn px-4 py-2 text-sm ${tool === value ? "btn-primary" : "btn-ghost"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {COLORS.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`لون ${value}`}
                onClick={() => setColor(value)}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  color === value ? "scale-110 border-[var(--accent)]" : "border-transparent"
                }`}
                style={{ background: value }}
              />
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm text-ink-soft">
            السماكة
            <input
              type="range"
              min={1}
              max={14}
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
              className="w-40"
            />
            <span className="tnum">{width}</span>
          </label>
        </div>

        <div ref={hostRef} className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface-3)_28%,transparent)]">
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-crosshair touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>

        <p className="text-[0.78rem] leading-[1.9] text-ink-faint">
          ارسم باللمس أو بالفأرة، وغيّر الأداة واللون والسماكة. يمكنك حفظ عملك كصورة PNG ومشاركتها أو
          إرفاقها في الواجب.
        </p>
      </div>
    </div>
  );
}
