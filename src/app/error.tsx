"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // surface the failure for debugging without leaking it to the user
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_20%,rgba(255,107,129,0.16),transparent_70%)]" />
      <p className="plate-label">ERROR 500</p>
      <h1 className="mt-5 font-display text-[clamp(2.2rem,7vw,4.4rem)] leading-[1.12] font-black text-ink">
        حدث خطأ غير متوقع
      </h1>
      <p className="mt-6 max-w-md text-base leading-[2.05] text-ink-soft">
        لم نتمكن من إكمال هذا الطلب. جرّب مرة أخرى، وإذا استمر المشكلة تواصل مع إدارة المنصة.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary px-7 py-4">
          إعادة المحاولة
        </button>
        <Link href="/" className="btn btn-ghost px-7 py-4">
          العودة للرئيسية
        </Link>
      </div>
    </main>
  );
}
