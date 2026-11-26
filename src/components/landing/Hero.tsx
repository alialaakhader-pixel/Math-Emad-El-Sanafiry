import Link from "next/link";
import { ArrowLeft, BookOpenCheck, FlaskConical, ShieldCheck } from "lucide-react";
import HeroScene from "@/components/HeroScene";
import MathTex from "@/components/MathTex";
import { MotionToggle, PlateCorners, Reveal } from "@/components/ui";
import type { LandingData } from "@/lib/queries";

const AR = new Intl.NumberFormat("ar-EG");

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="tnum text-2xl font-medium text-accent">{value > 0 ? AR.format(value) : "—"}</span>
      <span className="text-[0.82rem] leading-snug text-ink-soft">{label}</span>
    </div>
  );
}

export default function Hero({ data }: { data: LandingData }) {
  const hasContent = data.counts.lectures > 0;

  return (
    <section className="relative overflow-hidden pt-[104px] pb-16 sm:pb-24">
      {/* engraved plate surface */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src="/images/plate-hero.svg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-[0.38] [mask-image:radial-gradient(120%_85%_at_75%_15%,#000_10%,transparent_72%)]"
        />
        <div className="absolute inset-0 grid-plate opacity-[0.5]" />
        <div className="absolute inset-0 vignette" />
      </div>

      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        {/* ── type block ── */}
        <div>
          <Reveal>
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip border-[rgba(79,227,232,0.32)] bg-[rgba(79,227,232,0.1)] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                منصة تعليمية عربية متخصصة في الرياضيات
              </span>
              <span className="plate-label">EST. EMAD EL SANAFYRY</span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-7 font-display text-[clamp(2.6rem,8vw,5.2rem)] leading-[1.05] font-black tracking-tight text-ink">
              مستر عماد السنافيري
              <span className="mt-2 block bg-gradient-to-l from-[#4fe3e8] via-[#2e7cf6] to-[#8b6bff] bg-clip-text text-transparent">
               منظومة الرياضيات المتكاملة
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-7 max-w-[560px] text-base leading-[2.05] text-ink-soft sm:text-lg">
              محتوى يُبنى على ترتيب واضح: الصف، ثم الترم، ثم الوحدة، ثم الدرس. بجانبه معمل تفاعلي
              لرسم الدوال والسبورة الهندسية، واختبارات وواجبات بتصحيح آلي، ونظام اشتراكات يحمي
              المحتوى ويمنح كل طالب ما يخصّه فقط.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn btn-primary px-7 py-4 text-base">
                إنشاء حساب مجاني
                <ArrowLeft size={18} />
              </Link>
              <Link href="/lab" className="btn btn-ghost px-7 py-4 text-base">
                <FlaskConical size={18} />
                جرّب المعمل الرياضي
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link href="/login" className="text-sm text-ink-soft underline decoration-line-strong underline-offset-8 transition hover:text-accent">
                لديك حساب؟ تسجيل الدخول
              </Link>
              <MotionToggle />
            </div>
          </Reveal>

          {/* live, honest metrics */}
          <Reveal delay={0.26}>
            <div className="glass mt-10 p-6">
              <div className="flex items-center gap-2">
                <span className="plate-label">LIVE FROM THE PLATFORM DATABASE</span>
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
                <Metric value={data.counts.lectures} label="محاضرة منشورة" />
                <Metric value={data.counts.modules} label="وحدة تعليمية" />
                <Metric value={data.counts.exams} label="اختبار" />
                <Metric value={data.counts.assignments} label="واجب" />
              </div>
              {!hasContent ? (
                <p className="mt-5 border-t border-line pt-4 text-[0.82rem] leading-relaxed text-ink-faint">
                  تظهر الأرقام هنا تلقائياً من قاعدة بيانات المنصة فور نشر المحتوى — بلا تقديرات ولا
                  أرقام مُختلَقة.
                </p>
              ) : null}
            </div>
          </Reveal>
        </div>

        {/* ── living mathematical instrument ── */}
        <Reveal delay={0.12} y={30}>
          <div className="relative">
            <div className="relative h-[420px] overflow-hidden rounded-[28px] border border-line bg-[radial-gradient(130%_100%_at_70%_15%,rgba(109,74,255,0.22),transparent_62%)] sm:h-[520px] lg:h-[620px] lg:-ml-24">
              <HeroScene className="h-full w-full" />
              <div className="pointer-events-none absolute inset-0 rounded-[28px] [box-shadow:inset_0_0_120px_rgba(7,11,28,0.75)]" />
              <PlateCorners />
            </div>

            {/* formula plates overlapping the instrument */}
            <div className="glass-strong absolute -top-3 right-2 flex items-center gap-2 px-4 py-2 lg:right-auto lg:-right-6">
              <span className="plate-label">01</span>
              <MathTex tex="\int_a^b f(x)\,dx = F(b) - F(a)" />
            </div>
            <div className="glass-strong absolute bottom-6 -left-2 flex items-center gap-2 px-4 py-2">
              <span className="plate-label">02</span>
              <MathTex tex="f'(x)=\lim_{h\to 0}\frac{f(x+h)-f(x)}{h}" />
            </div>
            <div className="glass-strong absolute top-1/2 -left-3 hidden items-center gap-2 px-4 py-2 sm:flex">
              <span className="plate-label">03</span>
              <MathTex tex="e^{i\pi}+1=0" />
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── structural trust strip (claims about the product, not about people) ── */}
      <div className="mx-auto mt-16 max-w-[1280px] px-5 sm:px-8">
        <div className="rule" />
        <div className="grid grid-cols-1 gap-8 py-10 sm:grid-cols-3">
          {[
            {
              icon: <BookOpenCheck size={20} />,
              title: "محتوى مرتّب لا يُشترى عشوائياً",
              body: "كل محاضرة تنتمي إلى وحدة وترم وصف دراسي محدّد، ويمكن للمدرس إضافتها من لوحة التحكم دون تعديل الكود.",
            },
            {
              icon: <ShieldCheck size={20} />,
              title: "وصول محسوب بالمعرّف والاشتراك",
              body: "التحقق من صلاحية المشاهدة يتم على الخادم في كل طلب، والأكواد تُخزَّن مجزّأة وتُستخدم مرة واحدة.",
            },
            {
              icon: <FlaskConical size={20} />,
              title: "أدوات تعمل فعلياً",
              body: "رسم دوال حقيقي، سبورة قابلة للحفظ، آلة حاسبة علمية، ومحرر معادلات يدعم LaTeX — لا رسوم زخرفية.",
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={0.06 * i}>
              <div className="flex gap-4">
                <span className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-[rgba(109,74,255,0.12)] text-accent">
                  {item.icon}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink">{item.title}</h3>
                  <p className="mt-2 text-[0.92rem] leading-[1.95] text-ink-soft">{item.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
