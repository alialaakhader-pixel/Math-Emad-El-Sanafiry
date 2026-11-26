"use client";

import { useState } from "react";
import MathTex from "@/components/MathTex";

const PRESETS: { label: string; snippet: string }[] = [
  { label: "كسر", snippet: "\\frac{a}{b}" },
  { label: "جذر", snippet: "\\sqrt{x}" },
  { label: "أس", snippet: "x^{n}" },
  { label: "تكامل", snippet: "\\int_{a}^{b} f(x)\\,dx" },
  { label: "تفاضل", snippet: "\\frac{d}{dx}f(x)" },
  { label: "مجموع", snippet: "\\sum_{k=1}^{n} a_k" },
  { label: "نهاية", snippet: "\\lim_{x\\to 0}" },
  { label: "جذور تربيعية", snippet: "x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}" },
  { label: "مصفوفة", snippet: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
];

export default function EquationEditor() {
  const [tex, setTex] = useState("\\int_0^1 x^2 \\,dx = \\frac{1}{3}");
  const [copied, setCopied] = useState(false);

  const insert = (snippet: string) => {
    setTex((prev) => `${prev}${prev.endsWith(" ") ? "" : " "}${snippet}`);
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="glass overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
        <div>
          <span className="plate-label">LATEX EQUATION EDITOR</span>
          <h3 className="mt-2 text-lg font-bold text-ink">محرر المعادلات</h3>
        </div>
        <button type="button" onClick={copy} className="btn btn-ghost px-4 py-2 text-sm">
          {copied ? "تم النسخ ✓" : "نسخ كود LaTeX"}
        </button>
      </div>

      <div className="grid gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => insert(preset.snippet)}
              className="chip cursor-pointer transition hover:border-accent hover:text-accent"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <textarea
          value={tex}
          onChange={(event) => setTex(event.target.value)}
          rows={4}
          dir="ltr"
          className="field text-left font-mono text-sm"
          aria-label="كود LaTeX"
        />

        <div className="min-h-[120px] overflow-x-auto rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface-3)_30%,transparent)] p-6">
          <span className="plate-label">PREVIEW</span>
          <div className="mt-4 text-xl">
            <MathTex tex={tex} block />
          </div>
        </div>

        <p className="text-[0.78rem] leading-[1.9] text-ink-faint">
          المحرر يدعم الكسور والجذور والأسس والتكامل والتفاضل والمصفوفات. انسخ الكود واستخدمه في وصف
          المحاضرات أو نص الأسئلة والإجابات.
        </p>
      </div>
    </div>
  );
}
