import Link from "next/link";
import type { ReactNode } from "react";
import MathTex from "@/components/MathTex";
import { Logo, MotionToggle, ThemeToggle } from "@/components/ui";

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src="/images/plate-hero.svg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-[0.32]"
        />
        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--surface)_74%,transparent)]" />
        <div className="absolute inset-0 grid-plate opacity-40" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col px-5 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo className="h-11 w-11" />
            <span>
              <span className="block font-display text-base font-extrabold text-ink">
                منصة مستر عماد السنافيري
              </span>
              <span className="plate-label block text-[0.58rem] tracking-[0.3em]">
                MATHEMATICS ACADEMY
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <MotionToggle className="hidden sm:inline-flex" />
            <ThemeToggle />
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <section>
            <span className="plate-label">SECURE ACCESS</span>
            <h1 className="mt-5 font-display text-[clamp(2rem,5vw,3.2rem)] leading-[1.15] font-black text-ink">
              {title}
            </h1>
            <p className="mt-5 max-w-[460px] text-base leading-[2.05] text-ink-soft">{subtitle}</p>

            <div className="glass mt-10 p-6">
              <div className="flex flex-wrap items-center gap-5">
                <MathTex tex="\lim_{n\to\infty}\frac{1}{n}\sum_{k=1}^{n}f\!\left(\frac{k}{n}\right)=\int_0^1 f(x)dx" />
              </div>
              <p className="mt-5 border-t border-line pt-5 text-[0.85rem] leading-[1.95] text-ink-faint">
                جلساتك محفوظة بشكل آمن، ويمكنك إنهاء أي جلسة من لوحة حسابك في أي وقت.
              </p>
            </div>
          </section>

          <section className="glass-strong p-8 sm:p-10">
            {children}
            <div className="mt-8 border-t border-line pt-6 text-sm text-ink-soft">{footer}</div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function FormMessage({ error, msg }: { error?: string; msg?: string }) {
  if (error) {
    return (
      <div
        role="alert"
        className="mb-6 rounded-2xl border border-[rgba(255,107,129,0.4)] bg-[rgba(255,107,129,0.12)] px-5 py-4 text-sm leading-[1.9] text-[var(--danger)]"
      >
        {error}
      </div>
    );
  }
  if (msg) {
    return (
      <div
        role="status"
        className="mb-6 rounded-2xl border border-[rgba(79,227,165,0.4)] bg-[rgba(79,227,165,0.12)] px-5 py-4 text-sm leading-[1.9] text-[var(--ok)]"
      >
        {msg}
      </div>
    );
  }
  return null;
}
