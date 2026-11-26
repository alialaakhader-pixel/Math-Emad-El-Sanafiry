import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 grid-plate opacity-40" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_20%,rgba(109,74,255,0.22),transparent_70%)]" />

      <Logo className="h-16 w-16" />
      <p className="plate-label mt-8">ERROR 404</p>
      <h1 className="mt-5 font-display text-[clamp(2.4rem,8vw,5rem)] leading-[1.1] font-black text-ink">
        الصفحة غير موجودة
      </h1>
      <p className="mt-6 max-w-md text-base leading-[2.05] text-ink-soft">
        ربما تغيّر الرابط أو حُذفت الصفحة. يمكنك العودة إلى الرئيسية أو فتح معمل الرياضيات مباشرةً.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn btn-primary px-7 py-4">
          العودة للرئيسية
        </Link>
        <Link href="/lab" className="btn btn-ghost px-7 py-4">
          معمل الرياضيات
        </Link>
      </div>
    </main>
  );
}
