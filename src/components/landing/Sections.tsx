import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Calculator,
  ClipboardCheck,
  FileSignature,
  FunctionSquare,
  GraduationCap,
  KeyRound,
  Layers,
  LineChart,
  MessageSquareText,
  PenTool,
  PlayCircle,
  Quote,
  Ruler,
  ShieldCheck,
  Sparkles,
  UserRoundCog,
} from "lucide-react";
import MathTex from "@/components/MathTex";
import { Logo, MotionToggle, Reveal, SectionHeader, Stagger, StaggerItem } from "@/components/ui";
import type { LandingData } from "@/lib/queries";

const AR = new Intl.NumberFormat("ar-EG");
const AR_DATE = new Intl.DateTimeFormat("ar-EG", { dateStyle: "long" });

/* ─────────────────────────── 02 · stages ─────────────────────────── */

export function Stages({ data }: { data: LandingData }) {
  return (
    <section id="stages" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <SectionHeader
        index="٠٢"
        kicker="STAGES & GRADES"
        title={
          <>
            كل صف دراسي له مساره <span className="text-accent">الواضح</span>
          </>
        }
        lead="الصفوف والوحدات مُدارة بالكامل من لوحة المدرس، وعدد المحاضرات المعروض أدناه يأتي مباشرة من قاعدة البيانات."
      />

      {data.grades.length === 0 ? (
        <EmptyPlate
          title="لم تُضف الصفوف الدراسية بعد"
          body="فور إضافة الصفوف والوحدات من لوحة التحكم ستظهر هنا تلقائياً مع عدد المحاضرات المتاحة لكل صف."
        />
      ) : (
        <Stagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.grades.map((grade) => (
            <StaggerItem key={grade.id}>
              <article className="glass card-hover relative h-full overflow-hidden p-7">
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-l from-transparent via-[var(--accent)] to-transparent opacity-60" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="plate-label">{grade.stage}</span>
                    <h3 className="mt-3 text-xl font-bold text-ink">{grade.name}</h3>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-[rgba(46,124,246,0.12)] text-accent">
                    <GraduationCap size={22} />
                  </span>
                </div>
                <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                  <span className="tnum text-lg text-accent">
                    {grade.lectureCount > 0 ? AR.format(grade.lectureCount) : "—"}
                  </span>
                  <span className="text-sm text-ink-soft">
                    {grade.lectureCount > 0 ? "محاضرة منشورة" : "لا توجد محاضرات منشورة بعد"}
                  </span>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}

/* ─────────────────────────── 03 · latest lectures ─────────────────────────── */

export function LatestLectures({ data }: { data: LandingData }) {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeader
            index="٠٣"
            kicker="LATEST LECTURES"
            title="أحدث ما يُنشر على المنصة"
            lead="لا نعرض محاضرات وهمية: القائمة أدناه تُبنى من المحاضرات المنشورة فعلياً، مرتبة من الأحدث."
          />
          <Link href="/register" className="btn btn-ghost">
            ابدأ التعلم
            <ArrowLeft size={17} />
          </Link>
        </div>

        {data.latest.length === 0 ? (
          <EmptyPlate
            title="لم تُنشر المحاضرات الأولى بعد"
            body="بمجرد أن ينشر المدرس محاضرة ستظهر هنا مع اسم الوحدة والترم ومدة المحاضرة."
          />
        ) : (
          <div className="mt-12 overflow-hidden rounded-[24px] border border-line">
            {data.latest.map((lecture, i) => (
              <Reveal key={lecture.id} delay={0.05 * i}>
                <article className="group grid grid-cols-1 items-center gap-4 border-b border-line bg-[color-mix(in_srgb,var(--surface-3)_45%,transparent)] p-6 transition hover:bg-[rgba(109,74,255,0.1)] sm:grid-cols-[auto_1fr_auto] sm:gap-6">
                  <span className="tnum text-sm text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip">{lecture.gradeName}</span>
                      <span className="chip">
                        {lecture.term} · {lecture.moduleTitle}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-ink transition group-hover:text-accent">
                      {lecture.title}
                    </h3>
                    {lecture.summary ? (
                      <p className="mt-2 max-w-2xl text-sm leading-[1.9] text-ink-soft">{lecture.summary}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3 text-ink-soft">
                    <PlayCircle size={20} className="text-accent" />
                    <span className="tnum text-sm">
                      {lecture.durationMinutes ? `${AR.format(lecture.durationMinutes)} دقيقة` : "بدون مدة محددة"}
                    </span>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── 04 · features ─────────────────────────── */

const FEATURES = [
  {
    icon: <Layers size={22} />,
    title: "بنية محتوى هرمية",
    body: "الصف ← الترم ← الوحدة ← الدرس. الترتيب ثابت وواضح، ويمكن إعادة ترتيب المحاضرات ونشرها أو إخفاؤها بنقرة.",
    span: "sm:col-span-2",
  },
  {
    icon: <ShieldCheck size={22} />,
    title: "حماية من جهة الخادم",
    body: "التحقق من الاشتراك يتم في كل طلب محتوى، لا في إخفاء الأزرار فقط.",
    span: "",
  },
  {
    icon: <KeyRound size={22} />,
    title: "أكواد تفعيل آمنة",
    body: "تُخزَّن مجزّأة، تُستخدم مرة واحدة، تُلغى في أي وقت، ولكل عملية تفعيل سجل قابل للمراجعة.",
    span: "",
  },
  {
    icon: <ClipboardCheck size={22} />,
    title: "اختبارات بتصحيح آلي",
    body: "اسئلة اختيار من متعدد تُصحَّح فوراً، وأسئلة مقالية تُصحَّح يدوياً مع ملاحظات المدرس.",
    span: "sm:col-span-2",
  },
  {
    icon: <LineChart size={22} />,
    title: "متابعة تقدّم حقيقية",
    body: "نسبة الإنجاز تُحسب من المحاضرات المكتملة فعلياً في سجل الطالب — لا تقديرات ولا أرقام تسويقية.",
    span: "sm:col-span-2",
  },
  {
    icon: <UserRoundCog size={22} />,
    title: "إدارة الأجهزة والجلسات",
    body: "الطالب يرى أجهزته المسجّلة ويمكنه إنهاء أي جلسة عن بُعد.",
    span: "",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <SectionHeader
        index="٠٤"
        kicker="PLATFORM CAPABILITIES"
        title="ما الذي يجعل المنصة أداة عمل يومية؟"
        lead="كل ميزة هنا مرتبطة بوظيفة حقيقية في النظام، لا بزر شكل."
      />
      <Stagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <StaggerItem key={feature.title} className={feature.span}>
            <article className="glass card-hover h-full p-7">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-[rgba(79,227,232,0.1)] text-accent">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink">{feature.title}</h3>
              <p className="mt-3 text-[0.92rem] leading-[2] text-ink-soft">{feature.body}</p>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ─────────────────────────── 05 · math lab band ─────────────────────────── */

const TOOLS = [
  { icon: <FunctionSquare size={18} />, title: "رسم الدوال", desc: "تحكم في المجال والتكبير، إظهار المحاور ونقاط التقاطع." },
  { icon: <PenTool size={18} />, title: "سبورة تفاعلية", desc: "رسم، أشكال هندسية، متجهات، تراجع وإعادة، وحفظ كصورة." },
  { icon: <Calculator size={18} />, title: "آلة حاسبة علمية", desc: "دوال مثلثية وأسّية وجذور ولوغاريتمات مع أقواس ودرجات/راديان." },
  { icon: <FileSignature size={18} />, title: "محرر معادلات", desc: "دعم LaTeX كامل مع معاينة فورية للكسور والجذور والتكامل." },
  { icon: <Ruler size={18} />, title: "الهندسة والمجسمات", desc: "مثلثات ودوائر وزوايا، ومجسمات ثلاثية الأبعاد مع حساب المساحة والحجم." },
];

export function LabBand() {
  return (
    <section id="lab" className="relative scroll-mt-24 overflow-hidden py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src="/images/plate-lab.svg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-[0.3]"
        />
        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--surface)_78%,transparent)]" />
        <div className="absolute inset-0 grid-plate opacity-40" />
      </div>

      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div>
            <SectionHeader
              index="٠٥"
              kicker="INTERACTIVE MATHEMATICS LAB"
              title={
                <>
                  معمل رياضي <span className="text-accent">يُحسب فعلاً</span>
                </>
              }
              lead="أدوات مبنية لتُستخدم داخل الدرس وخارجه: تكتب الدالة فترسمها، وتحل المسألة فتراها خطوة بخطوة، وترسم فتحفظ عملك."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/lab" className="btn btn-primary px-7 py-4">
                افتح المعمل
                <ArrowLeft size={18} />
              </Link>
              <Link href="/register" className="btn btn-ghost px-7 py-4">
                أنشئ حساباً للوصول الكامل
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {TOOLS.map((tool, i) => (
              <Reveal key={tool.title} delay={0.05 * i}>
                <article
                  className={`glass card-hover p-6 ${i === 0 ? "sm:col-span-2" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-[rgba(46,124,246,0.14)] text-accent">
                      {tool.icon}
                    </span>
                    <h3 className="text-base font-bold text-ink">{tool.title}</h3>
                  </div>
                  <p className="mt-3 text-[0.88rem] leading-[1.95] text-ink-soft">{tool.desc}</p>
                </article>
              </Reveal>
            ))}
            <Reveal delay={0.3} className="sm:col-span-2">
              <div className="glass flex flex-wrap items-center justify-between gap-4 p-6">
                <div className="flex flex-wrap items-center gap-6">
                  <MathTex tex="\frac{d}{dx}x^n = n x^{n-1}" />
                  <MathTex tex="\sin^2x+\cos^2x=1" />
                  <MathTex tex="\sqrt{a^2+b^2}" />
                </div>
                <Link href="/lab" className="text-sm text-accent underline underline-offset-8">
                  جرّب كل أداة الآن
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── 06 · how to start ─────────────────────────── */

const STEPS = [
  { icon: <UserRoundCog size={20} />, title: "أنشئ حسابك", body: "بريد إلكتروني وكلمة مرور، أو تسجيل الدخول عبر Google عند تفعيله من إعدادات المنصة." },
  { icon: <KeyRound size={20} />, title: "فعّل اشتراكك", body: "أدخل كود التفعيل الذي حصلت عليه، أو يفعّلك المدرس مباشرةً باستخدام معرّف الطالب." },
  { icon: <BookOpen size={20} />, title: "اختر صفّك", body: "تُحدَّد الوحدات والمحاضرات المتاحة لك تلقائياً حسب الصف والاشتراك." },
  { icon: <Sparkles size={20} />, title: "تعلّم وتختبر", body: "شاهد المحاضرات، حل الواجبات، ادخل الاختبارات، وتابع تقدّمك من لوحة الطالب." },
];

export function HowToStart() {
  return (
    <section id="start" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <SectionHeader
        index="٠٦"
        kicker="GETTING STARTED"
        title="أربع خطوات من التسجيل إلى أول اختبار"
        align="center"
      />
      <Stagger className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <StaggerItem key={step.title}>
            <article className="relative h-full rounded-[22px] border border-line bg-[color-mix(in_srgb,var(--surface-3)_38%,transparent)] p-7">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line text-accent">
                  {step.icon}
                </span>
                <span className="tnum text-3xl font-medium text-[color-mix(in_srgb,var(--ink)_18%,transparent)]">
                  {AR.format(i + 1)}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-bold text-ink">{step.title}</h3>
              <p className="mt-3 text-[0.9rem] leading-[1.95] text-ink-soft">{step.body}</p>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ─────────────────────────── 07 · plans ─────────────────────────── */

const PLANS = [
  {
    name: "الوصول المفتوح",
    price: "مجاناً",
    note: "بدون اشتراك",
    items: ["الصفحة العامة للمنصة", "معمل الرياضيات التفاعلي", "استكشاف الصفوف والوحدات المتاحة"],
    cta: { label: "ابدأ الآن", href: "/register" },
    featured: false,
  },
  {
    name: "الاشتراك بالكود",
    price: "حسب الكود",
    note: "مدة الاشتراك محددة داخل الكود",
    items: [
      "محاضرات الصف الدراسي المحدد",
      "المذكرات والملفات المرفقة",
      "الاختبارات والواجبات مع التصحيح",
      "متابعة التقدّم والنتائج",
    ],
    cta: { label: "أنا لدي كود", href: "/dashboard" },
    featured: true,
  },
  {
    name: "التفعيل المباشر",
    price: "باتفاق المدرس",
    note: "يتم من لوحة المدرس بمعرّف الطالب",
    items: ["تفعيل فوري بدون كود", "تحديد المدة وتاريخ البداية والنهاية", "إشعار فوري للطالب", "سجل كامل للعملية"],
    cta: { label: "تواصل للتفعيل", href: "/register" },
    featured: false,
  },
];

export function Plans() {
  return (
    <section id="plans" className="mx-auto max-w-[1280px] scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <SectionHeader
        index="٠٧"
        kicker="ACCESS & SUBSCRIPTIONS"
        title="طرق الوصول إلى المحتوى"
        lead="لا نعرض أسعاراً غير معلنة ولا خصوماً مُختلَقة: كل كود يحمل مدته وصلاحيته، ويحدّد المدرس سعره عند إصداره."
      />
      <Stagger className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <StaggerItem key={plan.name}>
            <article
              className={`relative flex h-full flex-col rounded-[26px] border p-8 ${
                plan.featured
                  ? "border-[rgba(79,227,232,0.42)] bg-[linear-gradient(160deg,rgba(109,74,255,0.22),rgba(46,124,246,0.08))] shadow-[var(--shadow-glow)]"
                  : "border-line bg-[color-mix(in_srgb,var(--surface-3)_34%,transparent)]"
              }`}
            >
              {plan.featured ? (
                <span className="absolute -top-3 right-8 rounded-full border border-[rgba(79,227,232,0.5)] bg-[var(--surface-2)] px-4 py-1 text-[0.72rem] text-accent">
                  الأكثر استخداماً
                </span>
              ) : null}
              <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-2xl font-extrabold text-ink">{plan.price}</span>
              </div>
              <p className="mt-2 text-[0.82rem] text-ink-faint">{plan.note}</p>
              <ul className="mt-7 grid gap-3 border-t border-line pt-6">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[0.92rem] leading-[1.85] text-ink-soft">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={plan.cta.href} className={`btn mt-8 w-full py-3.5 ${plan.featured ? "btn-primary" : "btn-ghost"}`}>
                {plan.cta.label}
              </Link>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/* ─────────────────────────── 08 · announcements ─────────────────────────── */

export function Announcements({ data }: { data: LandingData }) {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
      <div className="glass overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-7">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-[rgba(255,107,129,0.12)] text-[var(--danger)]">
              <Bell size={20} />
            </span>
            <div>
              <span className="plate-label">ANNOUNCEMENTS</span>
              <h2 className="mt-1 text-xl font-bold text-ink">إعلانات وتنبيهات المنصة</h2>
            </div>
          </div>
          <span className="text-sm text-ink-faint">تُدار من لوحة المدرس وتُحدَّث لحظياً</span>
        </div>

        {data.announcements.length === 0 ? (
          <div className="p-8">
            <EmptyPlate
              title="لا توجد إعلانات منشورة حالياً"
              body="عندما ينشر المدرس إعلاناً جديداً سيظهر هنا مباشرةً وفي إشعارات الطلاب."
              compact
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {data.announcements.map((item) => (
              <li key={item.id} className="flex flex-col gap-2 p-7">
                <div className="flex flex-wrap items-center gap-3">
                  {item.isPinned ? <span className="chip border-[rgba(79,227,232,0.4)] text-accent">مثبّت</span> : null}
                  <h3 className="text-lg font-bold text-ink">{item.title}</h3>
                  <span className="tnum text-xs text-ink-faint">{AR_DATE.format(item.createdAt)}</span>
                </div>
                <p className="max-w-3xl text-[0.92rem] leading-[2] text-ink-soft">{item.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── 09 · testimonials (honest empty state) ─────────────────────────── */

export function Testimonials() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
      <div className="relative overflow-hidden rounded-[28px] border border-line bg-[linear-gradient(150deg,rgba(109,74,255,0.14),transparent_60%)] p-10 sm:p-14">
        <Quote size={92} className="absolute -top-2 left-6 opacity-[0.08]" />
        <div className="max-w-2xl">
          <span className="plate-label">STUDENT VOICES</span>
          <h2 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">
            آراء الطلاب — تُنشر بإذن أصحابها فقط
          </h2>
          <p className="mt-5 text-base leading-[2.05] text-ink-soft">
            لا نعرض تقييمات ولا شهادات ولا أسماء طلاب لم نحصل على إذنهم. عند توفر آراء حقيقية بموافقة
            أصحابها ستُعرض هنا كما هي، باسم صاحبها وبتاريخها.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {["تقييمات موثّقة", "بدون صور مُختلَقة", "بموافقة الطالب"].map((label) => (
              <div key={label} className="rounded-2xl border border-dashed border-line-strong p-5 text-center text-sm text-ink-faint">
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── 10 · FAQ ─────────────────────────── */

const FAQS = [
  {
    q: "كيف أحصل على كود التفعيل؟",
    a: "يصدر أكواد التفعيل المدرس من لوحة التحكم ويسلّمها للطالب. الكود يحمل صفاً دراسياً ومدة اشتراك، ويُستخدم مرة واحدة فقط.",
  },
  {
    q: "ماذا لو انتهى اشتراكي؟",
    a: "يظهر تنبيه في لوحة الطالب قبل الانتهاء، ويمكن تجديد الاشتراك بكود جديد أو بالتفعيل المباشر من المدرس باستخدام معرّف الطالب.",
  },
  {
    q: "هل يمكنني مشاهدة المحاضرات بدون اشتراك؟",
    a: "لا. التحقق من صلاحية المشاهدة يتم على الخادم في كل طلب، ويتوقف الوصول تلقائياً عند انتهاء الاشتراك.",
  },
  {
    q: "هل تعمل الأدوات على الهاتف؟",
    a: "نعم، جميع الأدوات مصممة للعمل على الشاشات الصغيرة، مع وضع تقليل الحركة وتحسين للأجهزة الضعيفة.",
  },
  {
    q: "كيف تُحسب نسبة الإنجاز؟",
    a: "تُحسب من المحاضرات التي سجّلت كمكتملة في سجل الطالب — لا من أرقام ثابتة ولا تقديرات تسويقية.",
  },
  {
    q: "هل تدعم المنصة اللغة العربية بالكامل؟",
    a: "نعم، الواجهة عربية بالكامل باتجاه RTL، مع دعم LaTeX للرموز والمعادلات الرياضية.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-[1000px] scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
      <SectionHeader index="٠٨" kicker="FREQUENTLY ASKED" title="أسئلة يتكرر طرحها" align="center" />
      <div className="mt-12 grid gap-4">
        {FAQS.map((item, i) => (
          <Reveal key={item.q} delay={0.04 * i}>
            <details className="group rounded-2xl border border-line bg-[color-mix(in_srgb,var(--surface-3)_32%,transparent)] p-6 transition hover:border-line-strong">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-ink">
                {item.q}
                <span className="text-accent transition group-open:rotate-45">＋</span>
              </summary>
              <p className="mt-4 text-[0.95rem] leading-[2.1] text-ink-soft">{item.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────── 11 · final CTA ─────────────────────────── */

export function FinalCta() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img src="/images/plate-paper.svg" alt="" aria-hidden="true" className="h-full w-full object-cover opacity-[0.18]" />
        <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_50%_0%,rgba(109,74,255,0.28),transparent_65%)]" />
      </div>
      <div className="mx-auto max-w-[860px] px-5 text-center sm:px-8">
        <Reveal>
          <h2 className="font-display text-[clamp(2.1rem,5.5vw,3.5rem)] leading-[1.18] font-black text-ink">
            ابدأ رحلتك مع الرياضيات
            <span className="block bg-gradient-to-l from-[#4fe3e8] to-[#8b6bff] bg-clip-text text-transparent">
              بخطوة واضحة اليوم
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-[600px] text-base leading-[2.05] text-ink-soft sm:text-lg">
            أنشئ حسابك في أقل من دقيقة، وافتح المعمل الرياضي مباشرةً، وفعّل اشتراكك عندما تحصل على الكود.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn btn-primary px-8 py-4 text-base">
              إنشاء حساب مجاني
              <ArrowLeft size={18} />
            </Link>
            <Link href="/login" className="btn btn-ghost px-8 py-4 text-base">
              تسجيل الدخول
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─────────────────────────── footer ─────────────────────────── */

export function Footer() {
  return (
    <footer className="border-t border-line bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)]">
      <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <div className="flex items-center gap-3">
              <Logo className="h-12 w-12" />
              <div>
                <p className="font-display text-lg font-extrabold text-ink">منصة مستر عماد السنافيري للرياضيات</p>
                <p className="plate-label mt-1">EMAD EL SANAFYRY · MATHEMATICS ACADEMY</p>
              </div>
            </div>
            <p className="mt-6 max-w-md text-[0.92rem] leading-[2] text-ink-soft">
              منظومة تعليمية عربية لتدريس الرياضيات: محتوى منظم، أدوات تفاعلية، تقييم مستمر، ونظام
              اشتراكات يحمي المحتوى ويحترم الطالب.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <MotionToggle />
            </div>
          </div>

          <FooterColumn
            title="المنصة"
            links={[
              { label: "الصفحة الرئيسية", href: "/" },
              { label: "معمل الرياضيات", href: "/lab" },
              { label: "لوحة الطالب", href: "/dashboard" },
              { label: "لوحة المدرس", href: "/admin" },
            ]}
          />
          <FooterColumn
            title="الحساب"
            links={[
              { label: "تسجيل الدخول", href: "/login" },
              { label: "إنشاء حساب", href: "/register" },
              { label: "الأسئلة الشائعة", href: "#faq" },
              { label: "الباقات", href: "#plans" },
            ]}
          />
          <div>
            <h3 className="plate-label">CONTACT</h3>
            <p className="mt-5 text-[0.92rem] leading-[2] text-ink-soft">
              روابط التواصل الرسمي (واتساب، قنوات، حسابات اجتماعية) تُضاف من لوحة المدرس وتظهر هنا
              مباشرةً عند حفظها.
            </p>
            <div className="mt-5 rounded-2xl border border-dashed border-line-strong p-4 text-[0.82rem] leading-[1.9] text-ink-faint">
              لم تُضف بيانات تواصل بعد
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-line pt-8 text-[0.82rem] text-ink-faint sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} منصة مستر عماد السنافيري للرياضيات — جميع الحقوق محفوظة.</p>
          <p className="tnum">BUILT WITH NEXT.JS · POSTGRESQL · TYPESCRIPT</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="plate-label">{title}</h3>
      <ul className="mt-5 grid gap-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[0.92rem] text-ink-soft transition hover:text-accent">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────── empty state ─────────────────────────── */

export function EmptyPlate({
  title,
  body,
  compact = false,
  icon = <MessageSquareText size={22} />,
}: {
  title: string;
  body: string;
  compact?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={`mt-8 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-line-strong bg-[color-mix(in_srgb,var(--surface-3)_26%,transparent)] text-center ${
        compact ? "p-8" : "p-14"
      }`}
    >
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-line text-accent">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-3 max-w-lg text-[0.92rem] leading-[2] text-ink-soft">{body}</p>
    </div>
  );
}
