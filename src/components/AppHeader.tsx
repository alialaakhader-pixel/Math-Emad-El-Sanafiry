import Link from "next/link";
import { logoutAction } from "@/lib/actions";
import { Logo, MotionToggle, ThemeToggle } from "@/components/ui";
import CalculatorDock from "@/components/CalculatorDock";
import type { SessionUser } from "@/lib/auth";

export default function AppHeader({
  user,
  label,
  backHref,
}: {
  user: SessionUser | null;
  label: string;
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span>
            <span className="block text-sm font-bold text-ink">{label}</span>
            <span className="plate-label block text-[0.56rem] tracking-[0.3em]">
              EMAD EL SANAFYRY ACADEMY
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <MotionToggle className="hidden md:inline-flex" />
          <ThemeToggle />
          {backHref ? (
            <Link href={backHref} className="btn btn-ghost px-4 py-2 text-sm">
              العودة للرئيسية
            </Link>
          ) : null}
          {user ? (
            <form action={logoutAction}>
              <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm">
                خروج
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn btn-primary px-5 py-2.5 text-sm">
              تسجيل الدخول
            </Link>
          )}
        </div>
      </div>
      {user?.role === "student" ? <CalculatorDock /> : null}
    </header>
  );
}
