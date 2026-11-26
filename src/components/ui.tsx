"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ─────────────────────────── brand mark ─────────────────────────── */

export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  const gradientId = `academy-mark-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="شعار منصة مستر عماد السنافيري">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#42e8df" />
          <stop offset="48%" stopColor="#3989ff" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="19" fill="rgba(17,28,63,.7)" stroke={`url(#${gradientId})`} strokeWidth="1.7" />
      <circle cx="32" cy="32" r="23" fill="none" stroke={`url(#${gradientId})`} strokeOpacity=".2" strokeWidth="1" strokeDasharray="2 4" />
      <path d="M12 47H52M17 12V52" stroke="currentColor" strokeOpacity=".24" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M13 43C20 43 20 19 29 19S37 43 44 43 49 28 53 21" fill="none" stroke={`url(#${gradientId})`} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M19 15L25 15M22 12V18" stroke="#a5f3fc" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="44" cy="43" r="3.2" fill="#5eead4" stroke="#071225" strokeWidth="1.5" />
      <path d="M37 12H50" stroke={`url(#${gradientId})`} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <Logo className={compact ? "h-9 w-9" : "h-11 w-11"} />
      <span className="leading-tight">
        <span className="block font-display text-[0.95rem] font-extrabold text-ink">
          مستر عماد السنافيري
        </span>
        <span className="plate-label block text-[0.58rem] tracking-[0.32em]">MATHEMATICS ACADEMY</span>
      </span>
    </span>
  );
}

/* ─────────────────────────── motion ─────────────────────────── */

export function Reveal({
  children,
  delay = 0,
  y = 22,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.62, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduced ? { opacity: 1 } : { opacity: 0, y: 24 },
        show: { opacity: 1, y: 0, transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────── section header ─────────────────────────── */

export function SectionHeader({
  index,
  kicker,
  title,
  lead,
  align = "start",
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <div className={`flex items-center gap-3 ${align === "center" ? "justify-center" : ""}`}>
        <span className="tnum text-xs text-accent">{index}</span>
        <span className="h-px w-8 bg-line-strong" />
        <span className="plate-label">{kicker}</span>
      </div>
      <h2 className="mt-5 text-2xl leading-[1.22] font-extrabold text-ink sm:text-3xl md:text-4xl">{title}</h2>
      {lead ? <p className="mt-5 text-base leading-[2] text-ink-soft sm:text-lg">{lead}</p> : null}
    </div>
  );
}

/* ─────────────────────────── toggles ─────────────────────────── */

function readTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("sanafyry-theme", next);
    } catch {
      /* storage unavailable */
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-accent hover:text-accent ${className}`}
    >
      <span className="text-lg leading-none">{mounted && theme === "light" ? "☾" : "☼"}</span>
    </button>
  );
}

export function MotionToggle({ className = "" }: { className?: string }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(document.documentElement.getAttribute("data-reduced-motion") === "true");
  }, []);

  const toggle = () => {
    const next = !reduced;
    document.documentElement.setAttribute("data-reduced-motion", String(next));
    try {
      localStorage.setItem("sanafyry-reduced-motion", String(next));
    } catch {
      /* storage unavailable */
    }
    setReduced(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={reduced}
      title="تقليل الحركة"
      className={`chip cursor-pointer transition hover:border-accent hover:text-accent ${className}`}
    >
      <span className="text-[0.7rem]">{reduced ? "◉" : "◎"}</span>
      تقليل الحركة
    </button>
  );
}

/* ─────────────────────────── decorative plate frame ─────────────────────────── */

export function PlateCorners() {
  return (
    <>
      <span className="pointer-events-none absolute top-4 right-4 h-4 w-4 border-t border-r border-line-strong" />
      <span className="pointer-events-none absolute top-4 left-4 h-4 w-4 border-t border-l border-line-strong" />
      <span className="pointer-events-none absolute bottom-4 right-4 h-4 w-4 border-b border-r border-line-strong" />
      <span className="pointer-events-none absolute bottom-4 left-4 h-4 w-4 border-b border-l border-line-strong" />
    </>
  );
}
