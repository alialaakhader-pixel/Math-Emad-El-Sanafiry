"use client";
import { useEffect, useRef } from "react";

/** Visual math editor (MathLive, MIT). Emits LaTeX through onChange. */
export default function MathInput({ value, onChange }: { value: string; onChange: (latex: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLElement & { value: string } | null>(null);
  const first = useRef(value);
  const cb = useRef(onChange); cb.current = onChange;
  useEffect(() => {
    let dead = false;
    (async () => {
      const ml = await import("mathlive");
      if (dead || !host.current) return;
      ml.MathfieldElement.fontsDirectory = "/mathlive-fonts";
      ml.MathfieldElement.soundsDirectory = null;
      const el = new ml.MathfieldElement();
      el.value = first.current;
      el.setAttribute("math-virtual-keyboard-policy", "auto");
      el.style.cssText = "width:100%;font-size:26px;padding:10px 12px;border-radius:14px;border:1px solid var(--border,#cbd5e1);background:var(--input-bg,rgba(127,127,127,.08));color:inherit;direction:ltr";
      el.addEventListener("input", () => cb.current(el.value));
      host.current.innerHTML = ""; host.current.appendChild(el); field.current = el as never;
    })();
    return () => { dead = true; };
  }, []);
  useEffect(() => { const el = field.current; if (el && el.value !== value) el.value = value; }, [value]);
  return <div ref={host} dir="ltr" style={{ minHeight: 58 }} aria-label="محرر المعادلات المرئي"/>;
}
