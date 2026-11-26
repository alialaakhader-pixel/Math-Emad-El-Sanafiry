"use client";

import { useEffect, useState } from "react";
import { Calculator as CalculatorIcon, X } from "lucide-react";
import Calculator from "@/components/lab/Calculator";

export default function CalculatorDock() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="فتح الآلة الحاسبة العلمية"
        title="الآلة الحاسبة العلمية"
        className="calculator-dock fixed bottom-5 left-5 z-[70] flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/30 bg-slate-950/75 text-cyan-200 shadow-[0_12px_44px_rgba(20,184,212,.28)] backdrop-blur-2xl transition hover:-translate-y-1 hover:border-cyan-200/70 hover:text-white sm:bottom-7 sm:left-7 sm:h-16 sm:w-16"
      >
        <CalculatorIcon size={27} strokeWidth={1.8} />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-slate-950 bg-cyan-300" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-md sm:items-center sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="الآلة الحاسبة العلمية"
            className="calculator-dialog glass-strong relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] p-3 shadow-2xl sm:rounded-[28px] sm:p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-3 px-2 pt-1">
              <div>
                <p className="plate-label">STUDENT MATH TOOL</p>
                <h2 className="mt-1 text-lg font-extrabold text-ink">الآلة الحاسبة العلمية</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق الآلة الحاسبة"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/5 text-ink transition hover:border-accent hover:text-accent"
              >
                <X size={19} />
              </button>
            </div>
            <Calculator />
          </section>
        </div>
      ) : null}
    </>
  );
}
