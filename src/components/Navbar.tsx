"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { MotionToggle, ThemeToggle, Wordmark } from "@/components/ui";

const LINKS = [
  { href: "#stages", label: "الصفوف" },
  { href: "#features", label: "المميزات" },
  { href: "#lab", label: "المعمل" },
  { href: "#start", label: "كيف تبدأ" },
  { href: "#plans", label: "الباقات" },
  { href: "#faq", label: "الأسئلة" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-line bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="الصفحة الرئيسية">
          <Wordmark compact />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm text-ink-soft transition hover:bg-[rgba(79,227,232,0.08)] hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <MotionToggle className="hidden sm:inline-flex" />
          <Link href="/login" className="btn btn-ghost hidden px-5 py-2.5 text-sm sm:inline-flex">
            تسجيل الدخول
          </Link>
          <Link href="/register" className="btn btn-primary px-5 py-2.5 text-sm">
            إنشاء حساب
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line lg:hidden"
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-5 py-4 lg:hidden">
          <nav className="grid gap-1" aria-label="قائمة الجوال">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm text-ink-soft transition hover:bg-[rgba(79,227,232,0.08)] hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost mt-2">
              تسجيل الدخول
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
