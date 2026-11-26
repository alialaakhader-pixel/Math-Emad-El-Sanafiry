import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Assistant from "@/components/lab/Assistant";
import Calculator from "@/components/lab/Calculator";
import EquationEditor from "@/components/lab/EquationEditor";
import FunctionPlotter from "@/components/lab/FunctionPlotter";
import SolidViewer from "@/components/lab/SolidViewer";
import Whiteboard from "@/components/lab/Whiteboard";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/landing/Sections";
import { Reveal } from "@/components/ui";

export const metadata: Metadata = {
  title: "معمل الرياضيات التفاعلي",
  description:
    "أدوات رياضية تعمل فعلياً: رسم الدوال، سبورة تفاعلية، آلة حاسبة علمية، محرر معادلات LaTeX، ومجسمات ثلاثية الأبعاد مع حساب الحجم والمساحة.",
};

export default function LabPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />

      <main className="pt-[72px]">
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <img
              src="/images/plate-lab.svg"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-[0.28]"
            />
            <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--surface)_72%,transparent)]" />
            <div className="absolute inset-0 grid-plate opacity-40" />
          </div>

          <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
            <Reveal>
              <div className="flex items-center gap-3">
                <span className="tnum text-xs text-accent">٠٥</span>
                <span className="h-px w-8 bg-line-strong" />
                <span className="plate-label">INTERACTIVE MATHEMATICS LAB</span>
              </div>
              <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.2rem,6vw,4rem)] leading-[1.12] font-black text-ink">
                معمل الرياضيات
                <span className="block bg-gradient-to-l from-[#4fe3e8] via-[#2e7cf6] to-[#8b6bff] bg-clip-text text-transparent">
                  أدوات تُحسب فعلاً
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-[2.05] text-ink-soft sm:text-lg">
                كل أداة في هذه الصفحة تنفّذ عمليات رياضية حقيقية: محرّك تعبيرات يفهم الدوال والأسس
                والجذور، وسبورة تحفظ عملك، ومجسمات تُظهر حجمها ومساحتها لحظياً.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="btn btn-primary px-7 py-4">
                  أنشئ حساباً لمتابعة تقدّمك
                  <ArrowLeft size={18} />
                </Link>
                <a href="#plotter" className="btn btn-ghost px-7 py-4">
                  ابدأ بالرسم
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 pb-24 sm:px-8">
          <section id="plotter" className="scroll-mt-24">
            <FunctionPlotter />
          </section>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Whiteboard />
            <Calculator />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <EquationEditor />
            <SolidViewer />
          </div>

          <section id="assistant" className="scroll-mt-24">
            <Assistant />
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
